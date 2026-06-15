# UsageLedger

UsageLedger is a usage-based billing and reconciliation platform for SaaS products.

It is built to help teams that bill on consumption rather than fixed seats. The platform ingests raw usage events, validates them, deduplicates retries, stores an immutable ledger, aggregates usage into meters, applies pricing, and runs reconciliation so billing data can be reviewed with confidence.

## What it does

UsageLedger is designed around a few core jobs:

- accept usage events from SDKs, HTTP clients, or CSV backfills
- validate event structure and values
- prevent duplicate billing from retries
- keep an append-only event ledger
- aggregate events into billable meters
- apply flat, tiered, volume, allowance, and credit pricing models
- reconcile raw usage against metered usage and calculated charges
- expose the results through a dashboard and API

This makes it useful for:

- AI products billing on tokens, requests, or images
- API platforms billing on request volume
- SaaS apps that need usage reporting and billing transparency

## Architecture

```text
SDK / REST API / CSV
        ↓
Usage event ingestion
        ↓
Validation and idempotency
        ↓
Immutable usage ledger
        ↓
Meter aggregation
        ↓
Pricing calculation
        ↓
Reconciliation
        ↓
Usage and billing reporting
```

## Product model

The system is organized by workspace.

Each workspace contains:

- API keys
- customers
- meter definitions
- pricing plans
- usage events
- dead-letter events
- reconciliation runs

### Core entities

- **Usage event**: the raw billable action emitted by your product
- **Meter**: a rule that turns events into usage totals
- **Pricing plan**: a rule that turns usage totals into currency
- **Reconciliation run**: a comparison between raw usage, metered usage, and charges

## Quickstart

### Run locally

Backend:

```bash
cd app/backend
python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd app/frontend
yarn install
yarn start
```

### Local defaults

```text
Backend: http://localhost:8000
Frontend: http://localhost:3000
Demo API key: ulk_demo_secret_key_xyz
```

### Smoke test the backend

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

Useful follow-ups:

```bash
curl -H "X-API-Key: ulk_demo_secret_key_xyz" \
  http://localhost:8000/api/v1/overview

curl -X POST http://localhost:8000/api/v1/reconciliation/run \
  -H "X-API-Key: ulk_demo_secret_key_xyz" \
  -H "Content-Type: application/json" \
  -d '{"period":"2026-06"}'
```

## API overview

All API routes are mounted under `/api`.

### Health

`GET /api/`

Returns service status.

### Events

`POST /api/v1/events`

Ingest one usage event.

`POST /api/v1/events/batch`

Ingest an array of usage events.

`POST /api/v1/events/csv`

Upload a CSV file with usage events.

`GET /api/v1/events`

List stored usage events.

### Customers

`POST /api/v1/customers`

Create a customer record.

`GET /api/v1/customers`

List customers in the workspace.

### Meters

`POST /api/v1/meters`

Create a meter definition.

`GET /api/v1/meters`

List meter definitions.

`DELETE /api/v1/meters/{meter_id}`

Delete a meter.

### Pricing plans

`POST /api/v1/pricing-plans`

Create a pricing plan for a meter.

`GET /api/v1/pricing-plans`

List pricing plans.

`DELETE /api/v1/pricing-plans/{plan_id}`

Delete a pricing plan.

### Usage and overview

`GET /api/v1/usage/{customer_id}`

Return usage totals and estimated charge for a customer.

`GET /api/v1/overview`

Return workspace summary metrics for the current period.

### Reconciliation

`POST /api/v1/reconciliation/run`

Run reconciliation for a billing period.

`GET /api/v1/reconciliation`

List reconciliation runs.

`GET /api/v1/reconciliation/{run_id}`

Fetch a reconciliation run.

### Dead-letter queue

`GET /api/v1/dead-letter-events`

List dead-letter events.

`POST /api/v1/dead-letter-events/{dlq_id}/retry`

Retry one dead-letter event.

`POST /api/v1/dead-letter-events/bulk-retry`

Retry all pending dead-letter events.

### Workspace and keys

`GET /api/v1/workspace`

Return the active workspace and API keys.

`POST /api/v1/workspace/keys`

Create a new API key.

## Event format

UsageLedger expects this base event envelope:

```json
{
  "event_id": "evt_001",
  "customer_id": "cust_123",
  "event_type": "llm_tokens",
  "timestamp": "2026-06-15T10:30:00Z",
  "properties": {}
}
```

Rules:

- `event_id` is required
- `customer_id` is required
- `event_type` is required
- `timestamp` is required and must be valid
- numeric values in `properties` must not be negative
- very old or far-future timestamps are rejected

## Deduplication and idempotency

The backend prevents duplicate billing by enforcing uniqueness on:

```sql
UNIQUE(workspace_id, external_event_id)
```

Behavior:

- same event ID and same payload = duplicate, ignored
- same event ID and different payload = idempotency conflict

Accepted events are stored immutably and are not overwritten.

## Meters and pricing

Supported meter aggregations:

- `COUNT`
- `SUM`
- `MAX`
- `MIN`
- `UNIQUE_COUNT`
- `LATEST`

Supported pricing models:

- `flat`
- `tiered`
- `volume`
- `allowance`
- `credit`

### Example meter

```json
{
  "slug": "input_tokens",
  "name": "Input Tokens",
  "event_type": "llm_tokens",
  "aggregation": "SUM",
  "value_field": "properties.input_tokens",
  "group_by": ["model"],
  "unit_label": "tokens"
}
```

### Example pricing plan

```json
{
  "name": "Input Tokens - Flat",
  "meter_slug": "input_tokens",
  "model": "flat",
  "config": {
    "rate": 0.001,
    "per_units": 1000
  },
  "currency": "INR"
}
```

## Reconciliation

Reconciliation compares:

- raw accepted events
- aggregated meter totals
- calculated charges

It helps identify:

- missing events
- duplicate events
- unpriced usage
- unknown customers
- unknown meters
- event count mismatches

The API returns the run status, summary metrics, and issues.

## Frontend

The frontend provides:

- workspace overview
- ingest screen
- event ledger
- meter management
- pricing management
- customer management
- reconciliation view
- dead-letter queue
- API key settings

It is meant to help operators and developers verify usage flows quickly.

## Local demo data

The local backend seeds a demo workspace with:

- customers
- meters
- pricing plans
- fixture usage events
- rejected events for DLQ testing

This is intended for smoke testing and product exploration.

## Technology

- Backend: FastAPI + MongoDB-compatible storage
- Frontend: React + React Router + React Query
- Validation: Pydantic
- API auth: `X-API-Key`

## Notes

- The backend and frontend are configured for local development in `app/backend/.env` and `app/frontend/.env`.
- The project is built to be run locally without external infrastructure.
- The demo key and demo workspace are only for local smoke tests.

