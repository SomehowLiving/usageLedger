"""Seed demo data: AI API Co with customers, meters, pricing, and fixture events."""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
import os
import secrets
from typing import Any, Dict, List

from db import db
from models import gen_id, utc_now_iso
from ingest import ingest_one

DEMO_WORKSPACE_NAME = "AI API Co"
DEMO_API_KEY = "ulk_demo_secret_key_xyz"


async def seed_if_empty() -> Dict[str, Any]:
    existing = await db.workspaces.find_one({"name": DEMO_WORKSPACE_NAME}, {"_id": 0})
    if existing:
        return {"seeded": False, "workspace_id": existing["id"]}

    ws_id = gen_id("ws")
    workspace = {"id": ws_id, "name": DEMO_WORKSPACE_NAME, "currency": "INR", "created_at": utc_now_iso()}
    await db.workspaces.insert_one(workspace)

    await db.api_keys.insert_one({
        "id": gen_id("ak"),
        "workspace_id": ws_id,
        "key": DEMO_API_KEY,
        "label": "primary",
        "created_at": utc_now_iso(),
    })

    customers = [
        {"external_id": "cust_123", "name": "Acme Inc.", "email": "billing@acme.test"},
        {"external_id": "cust_456", "name": "Beta Labs", "email": "ops@beta.test"},
        {"external_id": "cust_789", "name": "Gamma Corp", "email": "fin@gamma.test"},
    ]
    for c in customers:
        await db.customers.insert_one({
            "id": gen_id("cus"),
            "workspace_id": ws_id,
            "external_id": c["external_id"],
            "name": c["name"],
            "email": c["email"],
            "contract_start": None,
            "contract_end": None,
            "created_at": utc_now_iso(),
        })

    meters = [
        {"slug": "input_tokens", "name": "Input Tokens", "event_type": "llm_tokens",
         "aggregation": "SUM", "value_field": "properties.input_tokens",
         "group_by": ["model"], "unit_label": "tokens"},
        {"slug": "output_tokens", "name": "Output Tokens", "event_type": "llm_tokens",
         "aggregation": "SUM", "value_field": "properties.output_tokens",
         "group_by": ["model"], "unit_label": "tokens"},
        {"slug": "images", "name": "Image Generations", "event_type": "image_generation",
         "aggregation": "COUNT", "value_field": None, "group_by": ["size"], "unit_label": "images"},
        {"slug": "api_requests", "name": "API Requests", "event_type": "api_request",
         "aggregation": "COUNT", "value_field": None, "group_by": ["endpoint"], "unit_label": "requests"},
    ]
    for m in meters:
        await db.meter_definitions.insert_one({
            "id": gen_id("mtr"), "workspace_id": ws_id, **m, "created_at": utc_now_iso(),
        })

    plans = [
        {"name": "Input Tokens — Flat", "meter_slug": "input_tokens", "model": "flat",
         "config": {"rate": 0.001, "per_units": 1000}},
        {"name": "Output Tokens — Flat", "meter_slug": "output_tokens", "model": "flat",
         "config": {"rate": 0.003, "per_units": 1000}},
        {"name": "Images — Flat ₹2 each", "meter_slug": "images", "model": "flat",
         "config": {"rate": 2.0, "per_units": 1}},
        {"name": "API Requests — 5k included + ₹0.01", "meter_slug": "api_requests", "model": "allowance",
         "config": {"included": 5000, "rate": 0.01, "per_units": 1}},
    ]
    plan_ids: List[str] = []
    for p in plans:
        pid = gen_id("plan")
        plan_ids.append(pid)
        await db.pricing_plans.insert_one({
            "id": pid, "workspace_id": ws_id, "currency": "INR",
            "created_at": utc_now_iso(), **p,
        })

    # Assign all plans to all customers
    for c in customers:
        for pid in plan_ids:
            await db.customer_plan_assignments.insert_one({
                "id": gen_id("cpa"),
                "workspace_id": ws_id,
                "customer_id": c["external_id"],
                "plan_id": pid,
                "starts_at": utc_now_iso(),
                "ends_at": None,
            })

    # Generate fixture events
    now = datetime.now(timezone.utc)
    compact_seed = os.environ.get("MONGO_URL", "").startswith("mongomock://")
    # Use this month so the dashboard shows current usage immediately
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def ts(offset_days: float) -> str:
        return (period_start + timedelta(days=offset_days)).isoformat()

    fixtures: List[Dict[str, Any]] = []

    # Acme - llm_tokens (gpt-5, gpt-4)
    for i in range(40):
        fixtures.append({
            "event_id": f"evt_acme_tok_{i:03d}",
            "customer_id": "cust_123",
            "event_type": "llm_tokens",
            "timestamp": ts(0.1 + i * 0.2),
            "properties": {
                "model": "gpt-5" if i % 3 != 0 else "gpt-4",
                "input_tokens": 2000 + (i * 50),
                "output_tokens": 700 + (i * 20),
            },
        })

    # Acme - duplicate retries (same id, same payload)
    fixtures.append(fixtures[0].copy())  # exact duplicate
    fixtures.append(fixtures[1].copy())

    # Acme - idempotency conflict (same id, different payload)
    conflict = fixtures[2].copy()
    conflict["properties"] = {**conflict["properties"], "input_tokens": 99999}
    fixtures.append(conflict)

    # Beta - images
    for i in range(12):
        fixtures.append({
            "event_id": f"evt_beta_img_{i:03d}",
            "customer_id": "cust_456",
            "event_type": "image_generation",
            "timestamp": ts(1 + i * 0.5),
            "properties": {"size": "1024x1024" if i % 2 == 0 else "512x512"},
        })

    # Beta - api_requests (5,200 in real Mongo; compact in-memory seed for local smoke tests)
    beta_api_count = 200 if compact_seed else 5200
    for i in range(beta_api_count):
        fixtures.append({
            "event_id": f"evt_beta_api_{i:05d}",
            "customer_id": "cust_456",
            "event_type": "api_request",
            "timestamp": ts(2 + (i / 5000)),
            "properties": {"endpoint": "/generate" if i % 2 else "/embed", "region": "ap-south-1"},
        })

    # Gamma - api_requests below allowance
    gamma_api_count = 100 if compact_seed else 2400
    for i in range(gamma_api_count):
        fixtures.append({
            "event_id": f"evt_gamma_api_{i:05d}",
            "customer_id": "cust_789",
            "event_type": "api_request",
            "timestamp": ts(3 + (i / 2500)),
            "properties": {"endpoint": "/chat"},
        })

    # Gamma - llm_tokens
    for i in range(20):
        fixtures.append({
            "event_id": f"evt_gamma_tok_{i:03d}",
            "customer_id": "cust_789",
            "event_type": "llm_tokens",
            "timestamp": ts(4 + i * 0.3),
            "properties": {
                "model": "gpt-5",
                "input_tokens": 1200,
                "output_tokens": 450,
            },
        })

    # Late-arriving event (occurred 2 days ago but ingested now)
    fixtures.append({
        "event_id": "evt_late_001",
        "customer_id": "cust_123",
        "event_type": "llm_tokens",
        "timestamp": (now - timedelta(days=2)).isoformat(),
        "properties": {"model": "gpt-5", "input_tokens": 5000, "output_tokens": 1500},
    })

    # Invalid event - negative tokens
    fixtures.append({
        "event_id": "evt_invalid_neg",
        "customer_id": "cust_123",
        "event_type": "llm_tokens",
        "timestamp": ts(5),
        "properties": {"model": "gpt-5", "input_tokens": -100, "output_tokens": 200},
    })

    # Invalid - missing fields
    fixtures.append({
        "event_id": "evt_invalid_missing",
        "event_type": "llm_tokens",
        "timestamp": ts(5),
        "properties": {},
    })

    # Unknown customer
    fixtures.append({
        "event_id": "evt_unknown_cust",
        "customer_id": "cust_NOTREAL",
        "event_type": "llm_tokens",
        "timestamp": ts(5.5),
        "properties": {"model": "gpt-5", "input_tokens": 100, "output_tokens": 50},
    })

    # Unknown meter
    fixtures.append({
        "event_id": "evt_unknown_meter",
        "customer_id": "cust_123",
        "event_type": "weird_unknown_event",
        "timestamp": ts(5.6),
        "properties": {"data": 1},
    })

    # Ingest fixtures (this exercises validation + idempotency + DLQ)
    accepted = duplicates = rejected = 0
    for f in fixtures:
        r = await ingest_one(ws_id, f)
        if r["status"] == "accepted":
            accepted += 1
        elif r["status"] == "duplicate":
            duplicates += 1
        else:
            rejected += 1

    return {
        "seeded": True,
        "workspace_id": ws_id,
        "api_key": DEMO_API_KEY,
        "fixtures": {
            "total": len(fixtures),
            "accepted": accepted,
            "duplicates": duplicates,
            "rejected": rejected,
        },
    }
