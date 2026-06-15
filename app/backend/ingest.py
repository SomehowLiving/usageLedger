"""Event ingestion logic: validation, idempotency, deduplication."""
from __future__ import annotations
import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Tuple

from db import db
from models import gen_id, utc_now_iso


def _payload_hash(payload: Dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def _validate_timestamp(ts: str) -> Tuple[bool, str]:
    try:
        # accept Z suffix
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
    except Exception:
        return False, "INVALID_TIMESTAMP"
    now = datetime.now(timezone.utc)
    if dt > now + timedelta(hours=24):
        return False, "FUTURE_TIMESTAMP"
    if dt < now - timedelta(days=365 * 2):
        return False, "ANCIENT_TIMESTAMP"
    return True, dt.astimezone(timezone.utc).isoformat()


def _validate_properties(properties: Dict[str, Any]) -> List[Dict[str, str]]:
    errors: List[Dict[str, str]] = []
    for k, v in (properties or {}).items():
        if isinstance(v, (int, float)) and v < 0:
            errors.append({"field": f"properties.{k}", "code": "INVALID_NUMBER", "message": f"{k} cannot be negative"})
    return errors


async def _customer_known(workspace_id: str, external_id: str) -> bool:
    found = await db.customers.find_one(
        {"workspace_id": workspace_id, "external_id": external_id}, {"_id": 1}
    )
    return found is not None


async def _meter_known(workspace_id: str, event_type: str) -> bool:
    found = await db.meter_definitions.find_one(
        {"workspace_id": workspace_id, "event_type": event_type}, {"_id": 1}
    )
    return found is not None


async def ingest_one(workspace_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Returns detail dict."""
    errors: List[Dict[str, str]] = []
    event_id = payload.get("event_id")
    customer_id = payload.get("customer_id")
    event_type = payload.get("event_type")
    timestamp = payload.get("timestamp")
    properties = payload.get("properties") or {}

    if not event_id:
        errors.append({"field": "event_id", "code": "REQUIRED", "message": "event_id is required"})
    if not customer_id:
        errors.append({"field": "customer_id", "code": "REQUIRED", "message": "customer_id is required"})
    if not event_type:
        errors.append({"field": "event_type", "code": "REQUIRED", "message": "event_type is required"})
    if not timestamp:
        errors.append({"field": "timestamp", "code": "REQUIRED", "message": "timestamp is required"})

    occurred_at = None
    if timestamp:
        ok, val = _validate_timestamp(timestamp)
        if not ok:
            errors.append({"field": "timestamp", "code": val, "message": f"timestamp {val}"})
        else:
            occurred_at = val

    errors.extend(_validate_properties(properties))

    # Hard schema errors -> reject + DLQ
    if errors:
        await db.dead_letter_events.insert_one({
            "id": gen_id("dlq"),
            "workspace_id": workspace_id,
            "raw_payload": payload,
            "reason": "FAILED_SCHEMA",
            "errors": errors,
            "status": "pending",
            "created_at": utc_now_iso(),
            "retried_at": None,
        })
        return {"event_id": event_id, "status": "rejected", "errors": errors}

    # Soft errors: unknown customer/meter -> DLQ but record
    soft_reason = None
    if not await _customer_known(workspace_id, customer_id):
        soft_reason = "UNKNOWN_CUSTOMER"
    elif not await _meter_known(workspace_id, event_type):
        soft_reason = "UNKNOWN_METER"

    if soft_reason:
        await db.dead_letter_events.insert_one({
            "id": gen_id("dlq"),
            "workspace_id": workspace_id,
            "raw_payload": payload,
            "reason": soft_reason,
            "errors": [{"field": "customer_id" if soft_reason == "UNKNOWN_CUSTOMER" else "event_type",
                        "code": soft_reason, "message": soft_reason}],
            "status": "pending",
            "created_at": utc_now_iso(),
            "retried_at": None,
        })
        return {"event_id": event_id, "status": "rejected", "errors": [{"code": soft_reason, "message": soft_reason}]}

    # Idempotency: check (workspace_id, external_event_id)
    h = _payload_hash(payload)
    existing = await db.usage_events.find_one(
        {"workspace_id": workspace_id, "external_event_id": event_id}, {"_id": 0}
    )
    if existing:
        if existing.get("payload_hash") == h:
            return {"event_id": event_id, "status": "duplicate"}
        # Conflict: same id, different payload -> DLQ
        await db.dead_letter_events.insert_one({
            "id": gen_id("dlq"),
            "workspace_id": workspace_id,
            "raw_payload": payload,
            "reason": "IDEMPOTENCY_CONFLICT",
            "errors": [{"field": "event_id", "code": "IDEMPOTENCY_CONFLICT",
                        "message": "Same event_id with a different payload was already ingested"}],
            "status": "pending",
            "created_at": utc_now_iso(),
            "retried_at": None,
        })
        return {"event_id": event_id, "status": "rejected", "errors": [{"code": "IDEMPOTENCY_CONFLICT"}]}

    doc = {
        "id": gen_id("ue"),
        "workspace_id": workspace_id,
        "external_event_id": event_id,
        "customer_id": customer_id,
        "event_type": event_type,
        "occurred_at": occurred_at,
        "received_at": utc_now_iso(),
        "properties": properties,
        "payload_hash": h,
        "processing_status": "accepted",
    }
    try:
        await db.usage_events.insert_one(doc)
    except Exception as e:
        # race on unique index
        if "duplicate key" in str(e).lower():
            return {"event_id": event_id, "status": "duplicate"}
        await db.dead_letter_events.insert_one({
            "id": gen_id("dlq"),
            "workspace_id": workspace_id,
            "raw_payload": payload,
            "reason": "PROCESSING_ERROR",
            "errors": [{"code": "DB_ERROR", "message": str(e)}],
            "status": "pending",
            "created_at": utc_now_iso(),
            "retried_at": None,
        })
        return {"event_id": event_id, "status": "rejected", "errors": [{"code": "PROCESSING_ERROR"}]}

    return {"event_id": event_id, "status": "accepted"}


async def ingest_batch(workspace_id: str, events: List[Dict[str, Any]]) -> Dict[str, Any]:
    accepted = duplicates = rejected = 0
    details = []
    for ev in events:
        r = await ingest_one(workspace_id, ev)
        details.append(r)
        if r["status"] == "accepted":
            accepted += 1
        elif r["status"] == "duplicate":
            duplicates += 1
        else:
            rejected += 1
    return {"accepted": accepted, "duplicates": duplicates, "rejected": rejected, "details": details}

