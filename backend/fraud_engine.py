from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
from emergentintegrations.llm.chat import LlmChat, UserMessage
import logging
import json

logger = logging.getLogger(__name__)

class FraudRule:
    def __init__(self, rule_dict: dict):
        self.id = rule_dict.get("id")
        self.name = rule_dict.get("name")
        self.description = rule_dict.get("description")
        self.rule_type = rule_dict.get("rule_type")  # amount, velocity, location, merchant
        self.condition = rule_dict.get("condition")
        self.threshold = rule_dict.get("threshold")
        self.weight = rule_dict.get("weight", 0.5)
        self.active = rule_dict.get("active", True)

    def evaluate(self, transaction: dict, context: dict) -> tuple[bool, float]:
        """Evaluate if transaction violates this rule. Returns (violated, score)"""
        if not self.active:
            return False, 0.0
        
        try:
            if self.rule_type == "amount":
                return self._check_amount(transaction)
            elif self.rule_type == "velocity":
                return self._check_velocity(transaction, context)
            elif self.rule_type == "location":
                return self._check_location(transaction, context)
            elif self.rule_type == "merchant":
                return self._check_merchant(transaction, context)
            elif self.rule_type == "time":
                return self._check_time(transaction)
        except Exception as e:
            logger.error(f"Error evaluating rule {self.name}: {e}")
            return False, 0.0
        
        return False, 0.0

    def _check_amount(self, transaction: dict) -> tuple[bool, float]:
        amount = transaction.get("amount", 0)
        if self.condition == "greater_than" and amount > self.threshold:
            return True, self.weight
        return False, 0.0

    def _check_velocity(self, transaction: dict, context: dict) -> tuple[bool, float]:
        recent_count = context.get("recent_transaction_count", 0)
        if recent_count > self.threshold:
            return True, self.weight
        return False, 0.0

    def _check_location(self, transaction: dict, context: dict) -> tuple[bool, float]:
        location = transaction.get("location", "")
        user_locations = context.get("user_locations", [])
        if location and location not in user_locations:
            return True, self.weight * 0.7
        return False, 0.0

    def _check_merchant(self, transaction: dict, context: dict) -> tuple[bool, float]:
        merchant = transaction.get("merchant", "")
        suspicious_merchants = context.get("suspicious_merchants", [])
        if merchant in suspicious_merchants:
            return True, self.weight
        return False, 0.0

    def _check_time(self, transaction: dict) -> tuple[bool, float]:
        timestamp = transaction.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        
        hour = timestamp.hour
        if hour >= 0 and hour < 5:  # Unusual hours
            return True, self.weight * 0.6
        return False, 0.0

class FraudEngine:
    def __init__(self, db: AsyncIOMotorDatabase, api_key: str):
        self.db = db
        self.api_key = api_key

    async def get_active_rules(self) -> List[FraudRule]:
        """Fetch all active fraud detection rules"""
        rules_data = await self.db.rules.find({"active": True}).to_list(100)
        return [FraudRule(rule) for rule in rules_data]

    async def get_transaction_context(self, user_id: str, device_id: str) -> dict:
        """Get contextual information for fraud detection"""
        # Get recent transactions count (last hour)
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        recent_count = await self.db.transactions.count_documents({
            "user_id": user_id,
            "timestamp": {"$gte": one_hour_ago.isoformat()}
        })

        # Get user's typical locations
        user_locations = await self.db.transactions.distinct(
            "location",
            {"user_id": user_id}
        )

        return {
            "recent_transaction_count": recent_count,
            "user_locations": user_locations[:10],
            "suspicious_merchants": ["SUSPICIOUS_MERCHANT_X", "FRAUD_SHOP"]
        }

    async def calculate_rule_score(self, transaction: dict, context: dict) -> tuple[float, List[str]]:
        """Calculate fraud score based on rules"""
        rules = await self.get_active_rules()
        total_score = 0.0
        violated_rules = []

        for rule in rules:
            violated, score = rule.evaluate(transaction, context)
            if violated:
                total_score += score
                violated_rules.append(rule.name)

        # Normalize score to 0-1 range
        normalized_score = min(total_score, 1.0)
        return normalized_score, violated_rules

    async def calculate_ai_score(self, transaction: dict) -> float:
        """Calculate fraud score using AI model"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"fraud_{transaction.get('id')}",
                system_message="You are a fraud detection expert. Analyze transactions and return a fraud risk score between 0.0 (safe) and 1.0 (fraudulent). Respond with ONLY a number between 0.0 and 1.0, nothing else."
            ).with_model("openai", "gpt-4o")

            transaction_info = f"""
Transaction Details:
- Amount: ${transaction.get('amount', 0)}
- Merchant: {transaction.get('merchant', 'Unknown')}
- Location: {transaction.get('location', 'Unknown')}
- Card Type: {transaction.get('card_type', 'Unknown')}
- Time: {transaction.get('timestamp', 'Unknown')}
- Device: {transaction.get('device_id', 'Unknown')}

Analyze this transaction for fraud risk. Consider:
1. Amount pattern
2. Merchant reputation
3. Location anomaly
4. Time of transaction
5. Overall suspicious patterns

Respond with ONLY a number between 0.0 and 1.0.
"""

            message = UserMessage(text=transaction_info)
            response = await chat.send_message(message)
            
            # Extract score from response
            score_text = response.strip()
            score = float(score_text)
            return max(0.0, min(1.0, score))

        except Exception as e:
            logger.error(f"Error calculating AI score: {e}")
            return 0.0

    async def analyze_transaction(self, transaction: dict) -> dict:
        """Perform complete fraud analysis on a transaction"""
        context = await self.get_transaction_context(
            transaction.get("user_id"),
            transaction.get("device_id")
        )

        rule_score, violated_rules = await self.calculate_rule_score(transaction, context)
        ai_score = await self.calculate_ai_score(transaction)

        # Combined score (weighted average)
        total_score = (rule_score * 0.4) + (ai_score * 0.6)

        return {
            "rule_score": rule_score,
            "ai_score": ai_score,
            "total_score": total_score,
            "violated_rules": violated_rules,
            "risk_level": self._get_risk_level(total_score)
        }

    def _get_risk_level(self, score: float) -> str:
        """Determine risk level based on score"""
        if score >= 0.8:
            return "CRITICAL"
        elif score >= 0.6:
            return "HIGH"
        elif score >= 0.4:
            return "MEDIUM"
        elif score >= 0.2:
            return "LOW"
        return "SAFE"