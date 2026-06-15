"""UsageLedger backend — FastAPI + MongoDB."""
from __future__ import annotations
import io
import csv
import json
import logging
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, File, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from db import db, ensure_indexes, close as close_db  # noqa: E402
from models import (  # noqa: E402
    IncomingEvent,
    gen_id,
    utc_now_iso,
)
from ingest import ingest_one, ingest_batch  # noqa: E402
from aggregator import compute_customer_usage, _period_bounds  # noqa: E402
from reconciler import run_reconciliation  # noqa: E402
from seed import seed_if_empty  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("usageledger")

app = FastAPI(title="UsageLedger", version="1.0.0")
api = APIRouter(prefix="/api")


# ============= Auth =============

async def get_workspace(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")) -> Dict[str, Any]:
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
    key_doc = await db.api_keys.find_one({"key": x_api_key}, {"_id": 0})
    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid API key")
    ws = await db.workspaces.find_one({"id": key_doc["workspace_id"]}, {"_id": 0})
    if not ws:
        raise HTTPException(status_code=401, detail="Workspace not found")
    return ws


WS = Depends(get_workspace)


# ============= Health =============

@api.get("/")
async def root():
    return {"service": "UsageLedger", "status": "ok"}


# ============= Events ingestion =============

@api.post("/v1/events")
async def post_event(event: IncomingEvent, ws: Dict[str, Any] = WS):
    r = await ingest_one(ws["id"], event.model_dump())
    return {"accepted": 1 if r["status"] == "accepted" else 0,
            "duplicates": 1 if r["status"] == "duplicate" else 0,
            "rejected": 1 if r["status"] == "rejected" else 0,
            "result": r}


@api.post("/v1/events/batch")
async def post_events_batch(events: List[IncomingEvent], ws: Dict[str, Any] = WS):
    result = await ingest_batch(ws["id"], [e.model_dump() for e in events])
    return result


@api.post("/v1/events/csv")
async def post_events_csv(file: UploadFile = File(...), ws: Dict[str, Any] = WS):
    """CSV columns: event_id,customer_id,event_type,timestamp,properties_json"""
    content = (await file.read()).decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    events: List[Dict[str, Any]] = []
    for row in reader:
        try:
            props = json.loads(row.get("properties_json") or "{}")
        except json.JSONDecodeError:
            props = {}
        events.append({
            "event_id": row.get("event_id"),
            "customer_id": row.get("customer_id"),
            "event_type": row.get("event_type"),
            "timestamp": row.get("timestamp"),
            "properties": props,
        })
    result = await ingest_batch(ws["id"], events)
    return result


@api.get("/v1/events")
async def list_events(
    ws: Dict[str, Any] = WS,
    limit: int = 50,
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    event_type: Optional[str] = None,
):
    q: Dict[str, Any] = {"workspace_id": ws["id"]}
    if status:
        q["processing_status"] = status
    if customer_id:
        q["customer_id"] = customer_id
    if event_type:
        q["event_type"] = event_type
    docs = await db.usage_events.find(q, {"_id": 0}).sort("received_at", -1).limit(limit).to_list(limit)
    return {"events": docs}


# ============= Customers =============

class CustomerIn(BaseModel):
    external_id: str
    name: str
    email: Optional[str] = None
    contract_start: Optional[str] = None
    contract_end: Optional[str] = None


@api.post("/v1/customers")
async def create_customer(payload: CustomerIn, ws: Dict[str, Any] = WS):
    existing = await db.customers.find_one(
        {"workspace_id": ws["id"], "external_id": payload.external_id}, {"_id": 0}
    )
    if existing:
        raise HTTPException(409, "Customer already exists")
    doc = {"id": gen_id("cus"), "workspace_id": ws["id"], **payload.model_dump(),
           "created_at": utc_now_iso()}
    await db.customers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/v1/customers")
async def list_customers(ws: Dict[str, Any] = WS):
    docs = await db.customers.find({"workspace_id": ws["id"]}, {"_id": 0}).to_list(1000)
    return {"customers": docs}


# ============= Meters =============

class MeterIn(BaseModel):
    slug: str
    name: str
    event_type: str
    aggregation: str
    value_field: Optional[str] = None
    group_by: List[str] = Field(default_factory=list)
    unit_label: str = "units"


@api.post("/v1/meters")
async def create_meter(payload: MeterIn, ws: Dict[str, Any] = WS):
    existing = await db.meter_definitions.find_one(
        {"workspace_id": ws["id"], "slug": payload.slug}, {"_id": 0}
    )
    if existing:
        raise HTTPException(409, "Meter slug already exists")
    if payload.aggregation not in {"COUNT", "SUM", "MAX", "MIN", "UNIQUE_COUNT", "LATEST"}:
        raise HTTPException(400, "Invalid aggregation type")
    doc = {"id": gen_id("mtr"), "workspace_id": ws["id"], **payload.model_dump(),
           "created_at": utc_now_iso()}
    await db.meter_definitions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/v1/meters")
async def list_meters(ws: Dict[str, Any] = WS):
    docs = await db.meter_definitions.find({"workspace_id": ws["id"]}, {"_id": 0}).to_list(500)
    return {"meters": docs}


@api.delete("/v1/meters/{meter_id}")
async def delete_meter(meter_id: str, ws: Dict[str, Any] = WS):
    r = await db.meter_definitions.delete_one({"workspace_id": ws["id"], "id": meter_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Meter not found")
    return {"deleted": True}


# ============= Pricing =============

class PlanIn(BaseModel):
    name: str
    meter_slug: str
    model: str  # flat | tiered | volume | allowance | credit
    config: Dict[str, Any] = Field(default_factory=dict)
    currency: str = "INR"


@api.post("/v1/pricing-plans")
async def create_plan(payload: PlanIn, ws: Dict[str, Any] = WS):
    if payload.model not in {"flat", "tiered", "volume", "allowance", "credit"}:
        raise HTTPException(400, "Invalid pricing model")
    doc = {"id": gen_id("plan"), "workspace_id": ws["id"], **payload.model_dump(),
           "created_at": utc_now_iso()}
    await db.pricing_plans.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/v1/pricing-plans")
async def list_plans(ws: Dict[str, Any] = WS):
    docs = await db.pricing_plans.find({"workspace_id": ws["id"]}, {"_id": 0}).to_list(500)
    return {"plans": docs}


@api.delete("/v1/pricing-plans/{plan_id}")
async def delete_plan(plan_id: str, ws: Dict[str, Any] = WS):
    r = await db.pricing_plans.delete_one({"workspace_id": ws["id"], "id": plan_id})
    await db.customer_plan_assignments.delete_many({"workspace_id": ws["id"], "plan_id": plan_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Plan not found")
    return {"deleted": True}


# ============= Usage =============

def _current_period() -> str:
    n = datetime.now(timezone.utc)
    return f"{n.year:04d}-{n.month:02d}"


@api.get("/v1/usage/{customer_id}")
async def get_usage(customer_id: str, period: Optional[str] = None, ws: Dict[str, Any] = WS):
    p = period or _current_period()
    return await compute_customer_usage(ws["id"], customer_id, p)


# ============= Reconciliation =============

@api.post("/v1/reconciliation/run")
async def reconcile(payload: Dict[str, Any] = None, ws: Dict[str, Any] = WS):
    period = (payload or {}).get("period") or _current_period()
    run = await run_reconciliation(ws["id"], period)
    return run


@api.get("/v1/reconciliation")
async def list_runs(ws: Dict[str, Any] = WS, limit: int = 20):
    docs = await db.reconciliation_runs.find(
        {"workspace_id": ws["id"]}, {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)
    return {"runs": docs}


@api.get("/v1/reconciliation/{run_id}")
async def get_run(run_id: str, ws: Dict[str, Any] = WS):
    doc = await db.reconciliation_runs.find_one({"workspace_id": ws["id"], "id": run_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Run not found")
    return doc


# ============= Dead Letter Queue =============

@api.get("/v1/dead-letter-events")
async def list_dlq(ws: Dict[str, Any] = WS, status: Optional[str] = None, limit: int = 100):
    q: Dict[str, Any] = {"workspace_id": ws["id"]}
    if status:
        q["status"] = status
    docs = await db.dead_letter_events.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"events": docs}


@api.post("/v1/dead-letter-events/{dlq_id}/retry")
async def retry_dlq(dlq_id: str, ws: Dict[str, Any] = WS):
    dlq = await db.dead_letter_events.find_one({"workspace_id": ws["id"], "id": dlq_id}, {"_id": 0})
    if not dlq:
        raise HTTPException(404, "DLQ event not found")
    if dlq["status"] != "pending":
        raise HTTPException(400, f"DLQ event status is {dlq['status']}")
    result = await ingest_one(ws["id"], dlq["raw_payload"])
    new_status = "resolved" if result["status"] in ("accepted", "duplicate") else "retried"
    await db.dead_letter_events.update_one(
        {"id": dlq_id, "workspace_id": ws["id"]},
        {"$set": {"status": new_status, "retried_at": utc_now_iso(),
                  "last_result": result}},
    )
    return {"id": dlq_id, "new_status": new_status, "result": result}


@api.post("/v1/dead-letter-events/bulk-retry")
async def bulk_retry_dlq(ws: Dict[str, Any] = WS):
    pending = await db.dead_letter_events.find(
        {"workspace_id": ws["id"], "status": "pending"}, {"_id": 0}
    ).to_list(5000)
    resolved = retried = 0
    for d in pending:
        r = await ingest_one(ws["id"], d["raw_payload"])
        ns = "resolved" if r["status"] in ("accepted", "duplicate") else "retried"
        await db.dead_letter_events.update_one(
            {"id": d["id"]},
            {"$set": {"status": ns, "retried_at": utc_now_iso(), "last_result": r}},
        )
        if ns == "resolved":
            resolved += 1
        else:
            retried += 1
    return {"processed": len(pending), "resolved": resolved, "still_failing": retried}


# ============= Workspace overview =============

@api.get("/v1/workspace")
async def workspace_info(ws: Dict[str, Any] = WS):
    keys = await db.api_keys.find({"workspace_id": ws["id"]}, {"_id": 0}).to_list(50)
    return {"workspace": ws, "api_keys": keys}


@api.post("/v1/workspace/keys")
async def create_api_key(payload: Dict[str, Any] = None, ws: Dict[str, Any] = WS):
    label = (payload or {}).get("label", "additional")
    key = f"ulk_{secrets.token_urlsafe(24)}"
    doc = {"id": gen_id("ak"), "workspace_id": ws["id"], "key": key, "label": label,
           "created_at": utc_now_iso()}
    await db.api_keys.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/v1/overview")
async def overview(ws: Dict[str, Any] = WS, period: Optional[str] = None):
    p = period or _current_period()
    start_iso, end_iso = _period_bounds(p)
    accepted = await db.usage_events.count_documents({
        "workspace_id": ws["id"], "processing_status": "accepted",
        "occurred_at": {"$gte": start_iso, "$lt": end_iso},
    })
    duplicates = await db.usage_events.count_documents({
        "workspace_id": ws["id"], "processing_status": "duplicate",
    })
    rejected = await db.dead_letter_events.count_documents({"workspace_id": ws["id"]})
    customers = await db.customers.count_documents({"workspace_id": ws["id"]})
    meters = await db.meter_definitions.count_documents({"workspace_id": ws["id"]})
    plans = await db.pricing_plans.count_documents({"workspace_id": ws["id"]})
    dlq_pending = await db.dead_letter_events.count_documents({"workspace_id": ws["id"], "status": "pending"})

    # MRR estimate: sum charges for all customers this period
    custs = await db.customers.find({"workspace_id": ws["id"]}, {"_id": 0}).to_list(1000)
    mrr = 0.0
    for c in custs:
        r = await compute_customer_usage(ws["id"], c["external_id"], p)
        mrr += r["total_charge"]

    # Per-day series for events accepted (current period)
    pipeline = [
        {"$match": {
            "workspace_id": ws["id"],
            "processing_status": "accepted",
            "occurred_at": {"$gte": start_iso, "$lt": end_iso},
        }},
        {"$project": {"day": {"$substr": ["$occurred_at", 0, 10]}}},
        {"$group": {"_id": "$day", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]
    series = await db.usage_events.aggregate(pipeline).to_list(100)
    daily = [{"day": r["_id"], "count": r["count"]} for r in series]

    return {
        "period": p,
        "accepted_events": accepted,
        "duplicates_blocked": duplicates,
        "dlq_total": rejected,
        "dlq_pending": dlq_pending,
        "customers": customers,
        "meters": meters,
        "plans": plans,
        "mrr_estimate": round(mrr, 2),
        "daily_events": daily,
    }


# ============= App lifecycle =============

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    info = await seed_if_empty()
    logger.info(f"Seed: {info}")


@app.on_event("shutdown")
async def on_shutdown():
    close_db()

