"""Reconciliation engine: compare raw events vs metered vs charged."""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, List

from db import db
from aggregator import aggregate_meter, calculate_charge, _period_bounds


async def run_reconciliation(workspace_id: str, period: str) -> Dict[str, Any]:
    start_iso, end_iso = _period_bounds(period)

    customers = await db.customers.find({"workspace_id": workspace_id}, {"_id": 0}).to_list(1000)
    customer_ext_ids = {c["external_id"] for c in customers}
    meters = await db.meter_definitions.find({"workspace_id": workspace_id}, {"_id": 0}).to_list(500)
    meter_by_type: Dict[str, List[Dict[str, Any]]] = {}
    for m in meters:
        meter_by_type.setdefault(m["event_type"], []).append(m)

    # Raw events accepted in period
    raw_events = await db.usage_events.find({
        "workspace_id": workspace_id,
        "occurred_at": {"$gte": start_iso, "$lt": end_iso},
        "processing_status": "accepted",
    }, {"_id": 0}).to_list(200000)

    raw_by_customer_type: Dict[tuple, int] = {}
    # raw_by_customer_type_value: Dict[tuple, float] = {}
    unknown_customers: List[str] = []
    unknown_meters: List[str] = []

    for ev in raw_events:
        cid = ev["customer_id"]
        et = ev["event_type"]
        raw_by_customer_type[(cid, et)] = raw_by_customer_type.get((cid, et), 0) + 1
        if cid not in customer_ext_ids and cid not in unknown_customers:
            unknown_customers.append(cid)
        if et not in meter_by_type and et not in unknown_meters:
            unknown_meters.append(et)

    issues: List[Dict[str, Any]] = []
    total_raw = len(raw_events)
    total_metered_units = 0.0
    total_charge = 0.0

    for cust in customers:
        ext = cust["external_id"]
        for meter in meters:
            result = await aggregate_meter(workspace_id, ext, meter, period)
            metered_count = result["event_count"]
            raw_count = raw_by_customer_type.get((ext, meter["event_type"]), 0)
            if metered_count != raw_count:
                issues.append({
                    "customer_id": ext,
                    "meter_slug": meter["slug"],
                    "code": "EVENT_COUNT_MISMATCH",
                    "raw_value": raw_count,
                    "metered_value": metered_count,
                    "difference": raw_count - metered_count,
                    "message": f"Raw event count {raw_count} != metered count {metered_count}",
                })
            total_metered_units += result["value"]
            plan = await db.pricing_plans.find_one({"workspace_id": workspace_id, "meter_slug": meter["slug"]}, {"_id": 0})
            if plan:
                ci = calculate_charge(plan, result["value"])
                total_charge += ci["charge"]
            elif result["value"] > 0:
                issues.append({
                    "customer_id": ext,
                    "meter_slug": meter["slug"],
                    "code": "UNPRICED_USAGE",
                    "raw_value": result["value"],
                    "metered_value": result["value"],
                    "difference": 0,
                    "message": f"No pricing plan for meter {meter['slug']}",
                })

    for cid in unknown_customers:
        issues.append({
            "customer_id": cid,
            "meter_slug": None,
            "code": "UNKNOWN_CUSTOMER",
            "raw_value": raw_by_customer_type.get((cid, ""), 0),
            "metered_value": 0,
            "difference": 0,
            "message": f"Customer {cid} not registered",
        })
    for et in unknown_meters:
        issues.append({
            "customer_id": "*",
            "meter_slug": et,
            "code": "UNKNOWN_METER",
            "raw_value": 0,
            "metered_value": 0,
            "difference": 0,
            "message": f"Event type '{et}' has no meter definition",
        })

    # Duplicate detection (events rejected with duplicate status during ingestion in period)
    dup_count = await db.usage_events.count_documents({
        "workspace_id": workspace_id,
        "processing_status": "duplicate",
        "received_at": {"$gte": start_iso, "$lt": end_iso},
    })

    status = "match" if not issues else "mismatch"
    summary = {
        "total_raw_events": total_raw,
        "duplicates_blocked": dup_count,
        "total_metered_units": round(total_metered_units, 4),
        "total_estimated_charge": round(total_charge, 4),
        "unknown_customers": len(unknown_customers),
        "unknown_meters": len(unknown_meters),
        "issue_count": len(issues),
    }

    run = {
        "workspace_id": workspace_id,
        "period": period,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "summary": summary,
        "issues": issues,
    }
    from models import gen_id
    run["id"] = gen_id("rec")
    await db.reconciliation_runs.insert_one(run)
    run.pop("_id", None)
    return run

