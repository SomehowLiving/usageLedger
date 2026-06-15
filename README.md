
### **UsageLedger**

A usage-based billing and reconciliation platform for SaaS products. It ingests raw product-usage events, validates them, prevents duplicate billing, aggregates usage into meters, calculates charges, and reconciles the results.

## Quickstart

Run the backend and frontend locally:

```bash
# Terminal 1
cd app/backend
python -m uvicorn server:app --host 0.0.0.0 --port 8000

# Terminal 2
cd app/frontend
yarn install
yarn start
```

Local defaults:

```text
Backend: http://localhost:8000
Frontend: http://localhost:3000
Demo API key: ulk_demo_secret_key_xyz
```

Smoke-test the API:

```bash
curl http://localhost:8000/api/

curl -H "X-API-Key: ulk_demo_secret_key_xyz" \
  http://localhost:8000/api/v1/workspace

curl -X POST http://localhost:8000/api/v1/events \
  -H "X-API-Key: ulk_demo_secret_key_xyz" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "evt_001",
    "customer_id": "cust_123",
    "event_type": "llm_tokens",
    "timestamp": "2026-06-15T10:30:00Z",
    "properties": {
      "model": "gpt-5",
      "input_tokens": 1200,
      "output_tokens": 450
    }
  }'
```

Useful follow-up checks:

```bash
curl -H "X-API-Key: ulk_demo_secret_key_xyz" \
  http://localhost:8000/api/v1/overview

curl -X POST http://localhost:8000/api/v1/reconciliation/run \
  -H "X-API-Key: ulk_demo_secret_key_xyz" \
  -H "Content-Type: application/json" \
  -d '{"period":"2026-06"}'
```

Example incoming events:

```json
{
  "event_id": "evt_001",
  "customer_id": "cust_123",
  "event_type": "llm_tokens",
  "timestamp": "2026-06-15T10:30:00Z",
  "properties": {
    "model": "gpt-5",
    "input_tokens": 1200,
    "output_tokens": 450
  }
}
```

Another customer might send:

```json
{
  "event_id": "evt_002",
  "customer_id": "cust_456",
  "event_type": "api_request",
  "timestamp": "2026-06-15T10:31:00Z",
  "properties": {
    "endpoint": "/generate",
    "region": "ap-south-1"
  }
}
```

The platform converts those raw events into billable usage.

```text
Customer cust_123
Input tokens:   82,000
Output tokens:  31,000
Calculated charge: ₹1,426
```

OpenMeter and Lago use a similar high-level model: ingest granular events, aggregate them into meters or billable metrics, and use the results for billing or usage limits. ([OpenMeter][2])

---

# Core workflow

```text
SDK / REST API / CSV
        ↓
Usage-event ingestion
        ↓
Schema validation
        ↓
Idempotency and deduplication
        ↓
Raw immutable event ledger
        ↓
Meter aggregation
        ↓
Pricing calculation
        ↓
Reconciliation
        ↓
Usage and billing report
```

---

# Features to implement

## 1. Usage ingestion API

```http
POST /v1/events
POST /v1/events/batch
```

Support:

* Individual events
* Batch ingestion
* JSON
* CSV backfills
* API-key authentication
* Idempotency keys

Example response:

```json
{
  "accepted": 98,
  "duplicates": 1,
  "rejected": 1
}
```

Using a common event envelope such as CloudEvents would be a reasonable design choice because CloudEvents defines a provider-neutral format for describing event data. ([CloudEvents][3])

---

## 2. Event validation

Validate:

```text
event_id exists
customer_id exists
event_type is registered
timestamp is valid
required properties exist
numeric values are non-negative
event is not unreasonably far in the future
```

Return structured errors:

```json
{
  "event_id": "evt_009",
  "status": "rejected",
  "errors": [
    {
      "field": "properties.tokens",
      "code": "INVALID_NUMBER",
      "message": "Token count cannot be negative"
    }
  ]
}
```

---

## 3. Idempotency and duplicate prevention

This is one of the strongest engineering signals.

Customers may retry requests after timeouts. The system must not bill the same event twice.

```text
First request:
evt_001 → accepted

Retry:
evt_001 → duplicate, ignored
```

Store a unique constraint:

```sql
UNIQUE(workspace_id, event_id)
```

Also detect conflicts:

```text
Same event_id + same payload
→ safe duplicate

Same event_id + different payload
→ idempotency conflict
```

---

## 4. Immutable event ledger

Keep every accepted raw event.

```sql
usage_events
------------
id
workspace_id
external_event_id
customer_id
event_type
occurred_at
received_at
properties JSONB
payload_hash
processing_status
```

Do not overwrite raw events after ingestion.

Corrections should be represented through:

* Adjustment events
* Reversal events
* Replacement events

That gives you an auditable history.

---

## 5. Configurable meter definitions

A meter defines how raw events become usage totals.

Example:

```json
{
  "slug": "api_requests",
  "event_type": "api_request",
  "aggregation": "COUNT",
  "group_by": ["endpoint"]
}
```

Token meter:

```json
{
  "slug": "input_tokens",
  "event_type": "llm_tokens",
  "aggregation": "SUM",
  "value_field": "properties.input_tokens",
  "group_by": ["model"]
}
```

Support:

```text
COUNT
SUM
MAX
MIN
UNIQUE_COUNT
LATEST
```

Zenskar’s billable-metric model similarly transforms individual usage events through configurable aggregation logic rather than billing directly from each event. ([Zenskar][4])

---

## 6. Late-arriving event handling

An event may arrive today but belong to yesterday’s billing period.

```json
{
  "occurred_at": "2026-06-14T23:50:00Z",
  "received_at": "2026-06-15T08:00:00Z"
}
```

Aggregation should use `occurred_at`, not merely ingestion time.

Lago’s ingestion documentation explicitly addresses retries and late-arriving events and assigns usage according to the event timestamp. ([Lago][5])

Your system should:

```text
Detect affected aggregation window
Invalidate the previous aggregate
Recompute the affected customer/meter window
Record the correction
```

---

## 7. Pricing engine

Support a few pricing models.

### Pay-as-you-go

```text
₹0.01 per API request
```

### Tiered pricing

```text
First 10,000 requests:   ₹0.02 each
Next 40,000 requests:    ₹0.015 each
Above 50,000 requests:   ₹0.01 each
```

### Volume pricing

```text
0–10,000 requests:  ₹0.02 for all units
10,001–50,000:      ₹0.015 for all units
50,001+:            ₹0.01 for all units
```

### Included allowance

```text
Monthly included units: 10,000
Charge only for overage
```

### Credit consumption

```text
1 image generation = 5 credits
1 text generation  = 1 credit
```

Zenskar currently lists pay-as-you-go, tiered, volume-based, prepaid, event-based, free-unit, and overage models among its usage-pricing cases. ([Zenskar][1])

---

## 8. Reconciliation engine

This is the differentiating feature.

Compare:

```text
Raw accepted events
        vs
Aggregated usage
        vs
Calculated charges
```

Example:

```text
Raw token total:          1,250,000
Aggregated token total:   1,248,500
Difference:                   1,500
Status: MISMATCH
```

The system should identify:

* Missing events
* Duplicate events
* Aggregation mismatches
* Unpriced usage
* Unknown customers
* Events outside contract dates
* Usage assigned to the wrong billing period

Output:

```json
{
  "customer_id": "cust_123",
  "period": "2026-06",
  "status": "mismatch",
  "raw_usage": 1250000,
  "metered_usage": 1248500,
  "difference": 1500
}
```

---

## 9. Dead-letter queue and replay

Invalid or temporarily unprocessable events go to a dead-letter queue.

```text
FAILED_SCHEMA
UNKNOWN_CUSTOMER
UNKNOWN_METER
PROCESSING_ERROR
```

Admin actions:

```http
POST /v1/dead-letter-events/{id}/retry
POST /v1/dead-letter-events/bulk-retry
```

After correcting a customer or meter configuration, affected events can be replayed safely.

---

## 10. Customer usage dashboard

Show:

```text
Current usage
Usage by meter
Estimated bill
Included allowance remaining
Recent events
Rejected events
```

For example:

```text
API Requests

Used:       42,560
Included:   10,000
Billable:   32,560
Estimate:   ₹488.40
```

---

# Recommended architecture


```text
┌───────────────────────────┐
│ REST API / SDK / CSV      │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Ingestion API             │
│ Validation + Idempotency  │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ PostgreSQL Event Ledger   │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Background Workers        │
│ Aggregation + Pricing     │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Metered Usage / Charges   │
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│ Reconciliation + Reports  │
└───────────────────────────┘
```

## Tech stack

```text
Backend:
TypeScript
Fastify or NestJS
PostgreSQL
Drizzle or Prisma

Jobs:
BullMQ
Redis

Frontend:
Next.js
TypeScript
TanStack Query

Testing:
Vitest
Testcontainers
k6

Infrastructure:
Docker Compose
GitHub Actions
OpenTelemetry
```

For the MVP, PostgreSQL is sufficient. Do not add Kafka, ClickHouse, Kubernetes, and five microservices merely to appear sophisticated.

You can add Redpanda or Kafka later as a documented scale-out version.

---

# Database tables

```text
workspaces
api_keys
customers

meter_definitions
pricing_plans
pricing_tiers
customer_plan_assignments

usage_events
event_processing_attempts
dead_letter_events

meter_aggregates
calculated_charges
billing_periods

reconciliation_runs
reconciliation_issues
```

---

# ENSURE THESE WORK SPECIFICALLY

Build only this initially:

```text
1. POST individual and batch usage events
2. Validate events
3. Deduplicate by event ID
4. Store immutable raw events
5. Configure COUNT and SUM meters
6. Aggregate usage by customer and month
7. Apply flat and tiered pricing
8. Run reconciliation
9. Display usage and estimated charge
10. Replay failed events
```

---

# Example demo scenario

Use an AI API company.

## Usage types

```text
Input tokens
Output tokens
Image generations
API requests
```

## Pricing

```text
Input tokens:
₹0.001 per 1,000 tokens

Output tokens:
₹0.003 per 1,000 tokens

Images:
₹2 per image

API requests:
First 5,000 included
₹0.01 per request afterward
```

Generate fixtures containing:

* Valid events
* Duplicate events
* Late events
* Invalid events
* Unknown customers
* Events with conflicting idempotency keys

Then demonstrate that the totals remain correct despite retries and late delivery.


---

---

## Product angle

**Target users:** AI SaaS companies, API businesses, cloud infrastructure products, implementation teams, and finance operations teams.

**Value model:** hosted usage-metering API priced by monthly event volume, with higher tiers for reconciliation, usage limits, and audit exports.
