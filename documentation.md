# UsageLedger Documentation

## What this product is

UsageLedger is a usage-based billing and reconciliation platform for SaaS products.

It is designed for teams that need to:

- ingest raw usage events from SDKs, APIs, or CSV backfills
- validate events before billing
- deduplicate retries and prevent double billing
- store an immutable usage ledger
- define meters that aggregate events into billable usage
- apply pricing models to usage
- run reconciliation against raw events, metered usage, and charges
- inspect usage, billing estimates, and dead-letter events in the frontend

The core idea is simple:

1. Your product emits usage events.
2. UsageLedger validates and stores them.
3. UsageLedger aggregates them into meters.
4. UsageLedger applies pricing.
5. UsageLedger reports what should be billed and what needs review.

This is useful for AI products, API platforms, and any SaaS that bills based on consumption rather than just subscriptions.

## Product model

UsageLedger is organized around a workspace.

Each workspace contains:

- API keys
- customers
- meter definitions
- pricing plans
- usage events
- dead-letter events
- reconciliation runs

The backend uses API-key authentication through the `X-API-Key` header.

## Primary concepts

### Usage event

A usage event is the raw unit of input to the platform.

Example:

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

### Meter

A meter defines how to transform events into billable usage.

Supported aggregation types:

- `COUNT`
- `SUM`
- `MAX`
- `MIN`
- `UNIQUE_COUNT`
- `LATEST`

Example meter:

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

### Pricing plan

A pricing plan maps a meter to a pricing model.

Supported models:

- `flat`
- `tiered`
- `volume`
- `allowance`
- `credit`

Example flat plan:

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

## How the SaaS flow works

For a SaaS customer integrating UsageLedger:

1. Create a workspace.
2. Create an API key.
3. Register customers.
4. Register meter definitions for the usage you want to bill.
5. Create pricing plans for each meter.
6. Send usage events as they occur.
7. Query usage and reconciliation results.
8. Use the frontend for review and billing visibility.

## Authentication

All workspace-scoped API calls require:

```http
X-API-Key: <api-key>
```

If the key is missing or invalid, the backend returns `401`.

## API reference

All API routes are mounted under `/api`.

### Health

#### `GET /api/`

Returns service status.

Example response:

```json
{
  "service": "UsageLedger",
  "status": "ok"
}
```

### Events

#### `POST /api/v1/events`

Ingest a single usage event.

Behavior:

- validates required fields
- validates timestamp range
- rejects negative numeric values in properties
- rejects unknown customers
- rejects unknown event types
- deduplicates by `event_id`
- stores accepted events immutably

Example response:

```json
{
  "accepted": 1,
  "duplicates": 0,
  "rejected": 0,
  "result": {
    "event_id": "evt_001",
    "status": "accepted"
  }
}
```

#### `POST /api/v1/events/batch`

Ingest a batch of usage events.

Request body is an array of event objects.

Example response:

```json
{
  "accepted": 98,
  "duplicates": 1,
  "rejected": 1,
  "details": []
}
```

#### `POST /api/v1/events/csv`

Ingest events from CSV upload.

Expected columns:

- `event_id`
- `customer_id`
- `event_type`
- `timestamp`
- `properties_json`

### Event listing

#### `GET /api/v1/events`

List stored events for the current workspace.

Query parameters:

- `limit`
- `status`
- `customer_id`
- `event_type`

### Customers

#### `POST /api/v1/customers`

Create a customer record.

Fields:

- `external_id`
- `name`
- `email` optional
- `contract_start` optional
- `contract_end` optional

#### `GET /api/v1/customers`

List customers in the workspace.

### Meters

#### `POST /api/v1/meters`

Create a meter definition.

Fields:

- `slug`
- `name`
- `event_type`
- `aggregation`
- `value_field` optional
- `group_by` optional
- `unit_label` optional

#### `GET /api/v1/meters`

List meter definitions.

#### `DELETE /api/v1/meters/{meter_id}`

Delete a meter by ID.

### Pricing plans

#### `POST /api/v1/pricing-plans`

Create a pricing plan for a meter.

Fields:

- `name`
- `meter_slug`
- `model`
- `config`
- `currency`

#### `GET /api/v1/pricing-plans`

List pricing plans.

#### `DELETE /api/v1/pricing-plans/{plan_id}`

Delete a plan and its customer assignments.

### Usage and billing estimates

#### `GET /api/v1/usage/{customer_id}`

Return metered usage and estimated charge for a customer for a billing period.

Query parameters:

- `period` optional, format `YYYY-MM`

Response includes:

- customer ID
- period
- per-meter usage
- pricing plan match
- estimated total charge

### Reconciliation

#### `POST /api/v1/reconciliation/run`

Run a reconciliation pass for a billing period.

Body:

```json
{
  "period": "2026-06"
}
```

The reconciliation engine compares:

- raw accepted events
- meter output
- calculated charges

It also reports:

- unknown customers
- unknown meters
- unpriced usage
- event count mismatches

#### `GET /api/v1/reconciliation`

List reconciliation runs.

#### `GET /api/v1/reconciliation/{run_id}`

Fetch one reconciliation run by ID.

### Dead-letter queue

#### `GET /api/v1/dead-letter-events`

List dead-letter events.

Query parameters:

- `status`
- `limit`

#### `POST /api/v1/dead-letter-events/{dlq_id}/retry`

Retry one dead-letter event.

#### `POST /api/v1/dead-letter-events/bulk-retry`

Retry all pending dead-letter events.

### Workspace and API keys

#### `GET /api/v1/workspace`

Return the current workspace and API keys.

#### `POST /api/v1/workspace/keys`

Create a new API key.

Body:

```json
{
  "label": "billing-service"
}
```

#### `GET /api/v1/overview`

Return a dashboard summary for the current billing period.

Includes:

- accepted events
- duplicates blocked
- dead-letter counts
- customer count
- meter count
- pricing plan count
- estimated recurring revenue
- daily event series

## Data model

Key persisted collections include:

- `workspaces`
- `api_keys`
- `customers`
- `meter_definitions`
- `pricing_plans`
- `customer_plan_assignments`
- `usage_events`
- `dead_letter_events`
- `reconciliation_runs`

### Important storage rules

- accepted usage events are append-only
- duplicates are not billed twice
- payload hashes are stored to detect idempotency conflicts
- dead-letter events preserve the rejected input for later replay

## Validation rules

An event is rejected if:

- `event_id` is missing
- `customer_id` is missing
- `event_type` is missing
- `timestamp` is missing or invalid
- a numeric property is negative
- the event is too far in the future

An event is routed to dead-letter handling if:

- the customer is unknown
- the event type has no meter
- a retry conflict occurs
- a storage/process error happens

## Frontend

The frontend provides:

- workspace overview
- event ingestion page
- event ledger
- meter management
- pricing management
- customer management
- reconciliation view
- dead-letter queue view
- API key settings

The frontend is intended for:

- operators who need to inspect live usage
- finance or billing teams who want estimates and reconciliation
- engineers who want to test integrations quickly

## Local demo mode

The local environment seeds:

- a demo workspace
- a demo API key
- sample customers
- meters
- pricing plans
- fixture events
- examples of rejected and duplicate events

This makes it possible to run the product locally and immediately see dashboards populated with data.

## Example integration pattern

Typical SaaS integration flow:

1. Your application records an API request, token usage, image generation, or other billable action.
2. Your backend sends an event to `POST /api/v1/events`.
3. UsageLedger validates and stores the event.
4. A meter converts the event into units.
5. Pricing turns units into currency.
6. Reconciliation checks that totals match expectations.

## Operational notes

- The service uses MongoDB or `mongomock` depending on environment configuration.
- CORS is enabled through backend configuration.
- The frontend expects the backend URL in `REACT_APP_BACKEND_URL`.
- The demo workspace is seeded automatically at startup in local mode.

## Recommended next steps for product users

If you want to adopt UsageLedger in a SaaS product, the practical rollout is:

1. define the usage events you already emit
2. register meters for those events
3. attach prices
4. start ingesting events in a staging workspace
5. compare UsageLedger output against your current billing numbers
6. enable reconciliation in production

