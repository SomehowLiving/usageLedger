"""Pydantic models for UsageLedger."""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Optional, List, Dict, Literal
import uuid

from pydantic import BaseModel, Field, ConfigDict


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:16]}"


class Workspace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: gen_id("ws"))
    name: str
    currency: str = "INR"
    created_at: str = Field(default_factory=utc_now_iso)


class ApiKey(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: gen_id("ak"))
    workspace_id: str
    key: str
    label: str = "default"
    created_at: str = Field(default_factory=utc_now_iso)


class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: gen_id("cus"))
    workspace_id: str
    external_id: str
    name: str
    email: Optional[str] = None
    contract_start: Optional[str] = None
    contract_end: Optional[str] = None
    created_at: str = Field(default_factory=utc_now_iso)


AggregationType = Literal["COUNT", "SUM", "MAX", "MIN", "UNIQUE_COUNT", "LATEST"]


class MeterDefinition(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: gen_id("mtr"))
    workspace_id: str
    slug: str
    name: str
    event_type: str
    aggregation: AggregationType
    value_field: Optional[str] = None  # dotted, e.g. "properties.input_tokens"
    group_by: List[str] = Field(default_factory=list)
    unit_label: str = "units"
    created_at: str = Field(default_factory=utc_now_iso)


PricingModel = Literal["flat", "tiered", "volume", "allowance", "credit"]


class PricingTier(BaseModel):
    up_to: Optional[float] = None  # null = infinity
    rate: float


class PricingPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: gen_id("plan"))
    workspace_id: str
    name: str
    meter_slug: str
    model: PricingModel
    # flat: rate, per_units (default 1)
    # tiered/volume: tiers
    # allowance: included, rate, per_units
    # credit: credits_per_unit, credit_rate (₹ per credit)
    config: Dict[str, Any] = Field(default_factory=dict)
    currency: str = "INR"
    created_at: str = Field(default_factory=utc_now_iso)


class CustomerPlanAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: gen_id("cpa"))
    workspace_id: str
    customer_id: str  # external_id
    plan_id: str
    starts_at: str = Field(default_factory=utc_now_iso)
    ends_at: Optional[str] = None


class UsageEvent(BaseModel):
    """Immutable, append-only event record."""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: gen_id("ue"))
    workspace_id: str
    external_event_id: str
    customer_id: str
    event_type: str
    occurred_at: str  # ISO
    received_at: str = Field(default_factory=utc_now_iso)
    properties: Dict[str, Any] = Field(default_factory=dict)
    payload_hash: str
    processing_status: Literal["accepted", "duplicate", "rejected"] = "accepted"


class DeadLetterEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: gen_id("dlq"))
    workspace_id: str
    raw_payload: Dict[str, Any]
    reason: str  # FAILED_SCHEMA, UNKNOWN_CUSTOMER, UNKNOWN_METER, IDEMPOTENCY_CONFLICT, PROCESSING_ERROR
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    status: Literal["pending", "retried", "resolved"] = "pending"
    created_at: str = Field(default_factory=utc_now_iso)
    retried_at: Optional[str] = None


class ReconciliationIssue(BaseModel):
    customer_id: str
    meter_slug: Optional[str] = None
    code: str
    raw_value: Optional[float] = None
    metered_value: Optional[float] = None
    difference: Optional[float] = None
    message: str


class ReconciliationRun(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: gen_id("rec"))
    workspace_id: str
    period: str  # YYYY-MM
    started_at: str = Field(default_factory=utc_now_iso)
    completed_at: Optional[str] = None
    status: Literal["running", "match", "mismatch"] = "running"
    summary: Dict[str, Any] = Field(default_factory=dict)
    issues: List[Dict[str, Any]] = Field(default_factory=list)


# ============ Inbound payloads ============


class IncomingEvent(BaseModel):
    event_id: str
    customer_id: str
    event_type: str
    timestamp: str
    properties: Dict[str, Any] = Field(default_factory=dict)


class IngestionResult(BaseModel):
    accepted: int = 0
    duplicates: int = 0
    rejected: int = 0
    details: List[Dict[str, Any]] = Field(default_factory=list)

