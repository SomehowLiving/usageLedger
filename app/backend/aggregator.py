"""Aggregation + pricing engine."""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from db import db


def _get_dotted(d: Dict[str, Any], path: str) -> Any:
    cur: Any = d
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _period_bounds(period: str) -> Tuple[str, str]:
    """period = 'YYYY-MM' -> (start_iso, end_iso) exclusive end."""
    year, month = period.split("-")
    y, m = int(year), int(month)
    start = datetime(y, m, 1, tzinfo=timezone.utc)
    if m == 12:
        end = datetime(y + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(y, m + 1, 1, tzinfo=timezone.utc)
    return start.isoformat(), end.isoformat()


async def aggregate_meter(
    workspace_id: str,
    customer_id: str,
    meter: Dict[str, Any],
    period: str,
) -> Dict[str, Any]:
    """Return { value, breakdown_by_group: [{group:{}, value}], event_count }."""
    start_iso, end_iso = _period_bounds(period)
    query = {
        "workspace_id": workspace_id,
        "customer_id": customer_id,
        "event_type": meter["event_type"],
        "processing_status": "accepted",
        "occurred_at": {"$gte": start_iso, "$lt": end_iso},
    }
    cursor = db.usage_events.find(query, {"_id": 0})
    events = await cursor.to_list(length=100000)

    agg = meter["aggregation"]
    value_field = meter.get("value_field")
    group_by = meter.get("group_by") or []

    groups: Dict[Tuple, Dict[str, Any]] = {}
    for ev in events:
        gkey = tuple(_get_dotted(ev, f"properties.{g}") for g in group_by)
        bucket = groups.setdefault(
            gkey,
            {"group": {g: _get_dotted(ev, f'properties.{g}') for g in group_by},
             "values": [], "count": 0, "uniques": set(), "latest_ts": None, "latest_val": None},
        )
        bucket["count"] += 1
        if value_field:
            v = _get_dotted(ev, value_field)
            if isinstance(v, (int, float)):
                bucket["values"].append(float(v))
                bucket["uniques"].add(v)
                if bucket["latest_ts"] is None or ev["occurred_at"] > bucket["latest_ts"]:
                    bucket["latest_ts"] = ev["occurred_at"]
                    bucket["latest_val"] = float(v)
            else:
                if v is not None:
                    bucket["uniques"].add(v)

    breakdown = []
    total = 0.0
    for gkey, b in groups.items():
        if agg == "COUNT":
            v = float(b["count"])
        elif agg == "SUM":
            v = sum(b["values"])
        elif agg == "MAX":
            v = max(b["values"]) if b["values"] else 0.0
        elif agg == "MIN":
            v = min(b["values"]) if b["values"] else 0.0
        elif agg == "UNIQUE_COUNT":
            v = float(len(b["uniques"]))
        elif agg == "LATEST":
            v = float(b["latest_val"] or 0.0)
        else:
            v = 0.0
        breakdown.append({"group": b["group"], "value": v, "event_count": b["count"]})
        total += v if agg in ("COUNT", "SUM", "UNIQUE_COUNT") else 0.0

    # For MAX/MIN/LATEST, overall value should be aggregated across groups too.
    if agg == "MAX":
        total = max((b["value"] for b in breakdown), default=0.0)
    elif agg == "MIN":
        total = min((b["value"] for b in breakdown), default=0.0)
    elif agg == "LATEST":
        # take overall latest
        latest_ts = None
        latest_v = 0.0
        for ev in events:
            if value_field:
                v = _get_dotted(ev, value_field)
                if isinstance(v, (int, float)) and (latest_ts is None or ev["occurred_at"] > latest_ts):
                    latest_ts = ev["occurred_at"]
                    latest_v = float(v)
        total = latest_v

    return {
        "value": total,
        "event_count": sum(b["event_count"] for b in breakdown),
        "breakdown": breakdown,
    }


def calculate_charge(plan: Dict[str, Any], usage_value: float) -> Dict[str, Any]:
    """Return {charge, billable_units, included_units, detail}."""
    model = plan["model"]
    cfg = plan.get("config", {})

    if model == "flat":
        per = float(cfg.get("per_units", 1))
        rate = float(cfg["rate"])
        charge = (usage_value / per) * rate
        return {
            "charge": round(charge, 4),
            "billable_units": usage_value,
            "included_units": 0,
            "detail": f"₹{rate} per {int(per)} units",
        }

    if model == "tiered":
        tiers = cfg["tiers"]
        remaining = usage_value
        prev = 0.0
        charge = 0.0
        breakdown = []
        for t in tiers:
            up_to = t.get("up_to")
            cap = float(up_to) if up_to is not None else float("inf")
            tier_size = cap - prev
            applied = min(remaining, tier_size)
            if applied > 0:
                line = applied * float(t["rate"])
                charge += line
                breakdown.append({"up_to": up_to, "rate": t["rate"], "units": applied, "amount": round(line, 4)})
                remaining -= applied
                prev = cap
            if remaining <= 0:
                break
        return {
            "charge": round(charge, 4),
            "billable_units": usage_value,
            "included_units": 0,
            "detail": breakdown,
        }

    if model == "volume":
        tiers = cfg["tiers"]
        rate = float(tiers[-1]["rate"])
        for t in tiers:
            up_to = t.get("up_to")
            if up_to is None or usage_value <= float(up_to):
                rate = float(t["rate"])
                break
        charge = usage_value * rate
        return {
            "charge": round(charge, 4),
            "billable_units": usage_value,
            "included_units": 0,
            "detail": f"All units at ₹{rate}",
        }

    if model == "allowance":
        included = float(cfg.get("included", 0))
        rate = float(cfg["rate"])
        per = float(cfg.get("per_units", 1))
        billable = max(0.0, usage_value - included)
        charge = (billable / per) * rate
        return {
            "charge": round(charge, 4),
            "billable_units": billable,
            "included_units": min(included, usage_value),
            "detail": f"{int(included)} included; ₹{rate} per {int(per)} thereafter",
        }

    if model == "credit":
        credits_per_unit = float(cfg.get("credits_per_unit", 1))
        credit_rate = float(cfg.get("credit_rate", 0))
        credits = usage_value * credits_per_unit
        charge = credits * credit_rate
        return {
            "charge": round(charge, 4),
            "billable_units": usage_value,
            "included_units": 0,
            "detail": f"{credits_per_unit} credit(s)/unit @ ₹{credit_rate}/credit",
        }

    return {"charge": 0.0, "billable_units": usage_value, "included_units": 0, "detail": "Unknown pricing model"}


async def compute_customer_usage(workspace_id: str, customer_external_id: str, period: str) -> Dict[str, Any]:
    """Return per-meter usage + estimated charge for a customer."""
    meters = await db.meter_definitions.find({"workspace_id": workspace_id}, {"_id": 0}).to_list(500)
    plans = await db.pricing_plans.find({"workspace_id": workspace_id}, {"_id": 0}).to_list(500)
    plan_by_meter = {p["meter_slug"]: p for p in plans}

    # active assignments
    assignments = await db.customer_plan_assignments.find(
        {"workspace_id": workspace_id, "customer_id": customer_external_id}, {"_id": 0}
    ).to_list(500)
    active_plan_ids = {a["plan_id"] for a in assignments}

    meters_out = []
    total_charge = 0.0
    for meter in meters:
        result = await aggregate_meter(workspace_id, customer_external_id, meter, period)
        plan = plan_by_meter.get(meter["slug"])
        charge_info: Dict[str, Any] = {"charge": 0.0, "billable_units": 0, "included_units": 0, "detail": "no plan"}
        if plan and (not active_plan_ids or plan["id"] in active_plan_ids):
            charge_info = calculate_charge(plan, result["value"])
            total_charge += charge_info["charge"]
        meters_out.append({
            "meter": meter,
            "usage": result,
            "plan": plan,
            "charge": charge_info,
        })

    return {
        "customer_id": customer_external_id,
        "period": period,
        "meters": meters_out,
        "total_charge": round(total_charge, 4),
    }

