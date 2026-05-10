#!/usr/bin/env python3
"""
Meta Ads MCP Server — stub met mock responses.

Tools:
    - get_daily_spend(date)
    - get_ad_performance(date, limit)
    - get_ad_details(ad_id)
    - list_campaigns()
    - list_ad_sets(campaign_id)

TODO (fase 2/3):
    - Vervang mock data met echte Meta Marketing API calls via facebook-business SDK
    - Voeg write operations toe (create_ad, update_budget, pause_ad) — ALLEEN als Maxim
      autonomy van Media Buyer upgrade naar 'assistant + goedkeuring'
    - Add batch request handling voor efficiency
"""
from __future__ import annotations

import json
import os
import random
import sys
from datetime import date, datetime

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    print("ERROR: mcp package niet geïnstalleerd. pip3 install mcp", file=sys.stderr)
    sys.exit(1)

BRAND = os.environ.get("BRAND", "unknown")
AD_ACCOUNT_ID = os.environ.get("META_AD_ACCOUNT_ID", "")
ACCESS_TOKEN = os.environ.get("META_ACCESS_TOKEN", "")

mcp = FastMCP(f"meta-ads-{BRAND}")

USE_MOCK = not (AD_ACCOUNT_ID and ACCESS_TOKEN)


def _mock_rng(seed_key: str) -> random.Random:
    return random.Random(hash(f"{BRAND}:{seed_key}"))


@mcp.tool()
def get_daily_spend(target_date: str) -> dict:
    """Get total spend, revenue, ROAS voor een specifieke dag."""
    if USE_MOCK:
        rng = _mock_rng(f"daily-{target_date}")
        spend = round(rng.uniform(800, 2500), 2)
        revenue = round(spend * rng.uniform(1.2, 3.2), 2)
        return {
            "date": target_date,
            "brand": BRAND,
            "ad_account_id": AD_ACCOUNT_ID or "act_MOCK",
            "spend": spend,
            "revenue": revenue,
            "roas": round(revenue / spend, 2),
            "orders": int(revenue / rng.uniform(55, 95)),
            "impressions": rng.randint(45000, 180000),
            "clicks": rng.randint(800, 4000),
            "_mock": True,
        }
    # TODO: live Meta Marketing API call
    raise NotImplementedError("Live Meta API niet geïmplementeerd")


@mcp.tool()
def get_ad_performance(target_date: str, limit: int = 20) -> dict:
    """Get per-ad performance voor een specifieke dag."""
    if USE_MOCK:
        rng = _mock_rng(f"perf-{target_date}")
        angles = ["edema", "circulation", "diabetic-neuropathy", "leg-cramps"]
        ads = []
        for i in range(min(limit, rng.randint(8, 16))):
            spend = round(rng.uniform(30, 400), 2)
            roas = rng.choice([0.6, 1.0, 1.5, 2.2, 3.0, 4.5])
            revenue = round(spend * roas * rng.uniform(0.8, 1.2), 2)
            ads.append({
                "ad_id": f"act_MOCK_{i:03d}",
                "name": f"{rng.choice(angles)}_variant_{i+1}",
                "angle": rng.choice(angles),
                "spend": spend,
                "revenue": revenue,
                "roas": round(roas, 2),
                "impressions": rng.randint(2000, 25000),
                "clicks": rng.randint(40, 600),
                "conversions": rng.randint(0, 25),
            })
        return {"date": target_date, "ads": ads, "_mock": True}
    raise NotImplementedError("Live Meta API niet geïmplementeerd")


@mcp.tool()
def get_ad_details(ad_id: str) -> dict:
    """Get volledige details voor een specifieke ad."""
    if USE_MOCK:
        rng = _mock_rng(f"ad-{ad_id}")
        return {
            "ad_id": ad_id,
            "name": f"Mock ad {ad_id}",
            "status": rng.choice(["ACTIVE", "PAUSED"]),
            "creative": {
                "title": "Mock headline",
                "body": "Mock ad copy body...",
                "call_to_action": "SHOP_NOW",
                "image_url": f"https://mock.example/{ad_id}.jpg",
            },
            "targeting": {
                "age_min": 45,
                "age_max": 75,
                "countries": ["US", "NL"],
                "interests": ["health", "wellness"],
            },
            "_mock": True,
        }
    raise NotImplementedError()


@mcp.tool()
def list_campaigns() -> dict:
    """List all campaigns in the ad account."""
    if USE_MOCK:
        return {
            "campaigns": [
                {"id": "cmp_001", "name": f"{BRAND.title()} - TOF Native", "status": "ACTIVE", "objective": "CONVERSIONS"},
                {"id": "cmp_002", "name": f"{BRAND.title()} - Retargeting", "status": "ACTIVE", "objective": "CONVERSIONS"},
                {"id": "cmp_003", "name": f"{BRAND.title()} - Brand Awareness", "status": "PAUSED", "objective": "REACH"},
            ],
            "_mock": True,
        }
    raise NotImplementedError()


@mcp.tool()
def list_ad_sets(campaign_id: str) -> dict:
    """List ad sets in a specific campaign."""
    if USE_MOCK:
        return {
            "campaign_id": campaign_id,
            "ad_sets": [
                {"id": f"{campaign_id}_as1", "name": "Broad US", "daily_budget": 150.00},
                {"id": f"{campaign_id}_as2", "name": "Lookalike 1%", "daily_budget": 100.00},
            ],
            "_mock": True,
        }
    raise NotImplementedError()


if __name__ == "__main__":
    mcp.run()
