"""MongoDB client and collection helpers."""
import os

from motor.motor_asyncio import AsyncIOMotorClient

try:
    from mongomock_motor import AsyncMongoMockClient
except ImportError:  # pragma: no cover - production deployments use real MongoDB.
    AsyncMongoMockClient = None

_mongo_url = os.environ['MONGO_URL']
if _mongo_url.startswith("mongomock://"):
    if AsyncMongoMockClient is None:
        raise RuntimeError("mongomock_motor is required for MONGO_URL=mongomock://...")
    _client = AsyncMongoMockClient()
else:
    _client = AsyncIOMotorClient(_mongo_url)
db = _client[os.environ['DB_NAME']]


async def ensure_indexes() -> None:
    # Unique constraint on (workspace_id, external_event_id) prevents duplicate billing.
    await db.usage_events.create_index(
        [("workspace_id", 1), ("external_event_id", 1)], unique=True
    )
    await db.usage_events.create_index([("workspace_id", 1), ("occurred_at", 1)])
    await db.usage_events.create_index([("workspace_id", 1), ("customer_id", 1)])
    await db.usage_events.create_index([("workspace_id", 1), ("event_type", 1)])
    await db.api_keys.create_index([("key", 1)], unique=True)
    await db.customers.create_index(
        [("workspace_id", 1), ("external_id", 1)], unique=True
    )
    await db.meter_definitions.create_index(
        [("workspace_id", 1), ("slug", 1)], unique=True
    )
    await db.dead_letter_events.create_index([("workspace_id", 1), ("created_at", -1)])


def close():
    _client.close()
