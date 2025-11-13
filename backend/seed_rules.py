import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid

load_dotenv('/app/backend/.env')

async def seed_rules():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if rules already exist
    existing = await db.rules.count_documents({})
    if existing > 0:
        print(f"Rules already exist ({existing} found). Skipping seed.")
        return
    
    default_rules = [
        {
            "id": str(uuid.uuid4()),
            "name": "High Amount Transaction",
            "description": "Alert on transactions above $5000",
            "rule_type": "amount",
            "condition": "greater_than",
            "threshold": 5000.0,
            "weight": 0.7,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Transaction Velocity Check",
            "description": "Alert on more than 5 transactions in 1 hour",
            "rule_type": "velocity",
            "condition": "greater_than",
            "threshold": 5.0,
            "weight": 0.6,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Unusual Hours Transaction",
            "description": "Alert on transactions between midnight and 5 AM",
            "rule_type": "time",
            "condition": "equals",
            "threshold": 1.0,
            "weight": 0.4,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    result = await db.rules.insert_many(default_rules)
    print(f"Seeded {len(result.inserted_ids)} default rules successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_rules())
