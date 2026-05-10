#!/usr/bin/env python3
"""
Google Ads MCP Server — stub met mock responses.

Tools:
    - get_daily_spend(date)
    - get_keyword_performance(date, limit)
    - get_campaign_performance(date)
    - get_search_terms(date, limit)
    - get_quality_scores()

TODO:
    - Vervang mock met google-ads python SDK calls
    - OAuth refresh flow
"""
from __future__ import annotations

import os
import random
import sys

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    print("ERROR: mcp package niet geïnstalleerd", file=sys.stderr)
    sys.exit(1)

BRAND = os.environ.get("BRAND", "unknown")
CUSTOMER_ID = os.environ.get("GOOGLE_ADS_CUSTOMER_ID", "")
DEV_TOKEN = os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN", "")

mcp = FastMCP(f"google-ads-{BRAND}")

USE_MOCK = not (CUSTOMER_ID and DEV_TOKEN)


def _rng(key: str) -> random.Random:
    return random.Random(hash(f"{BRAND}:google:{key}"))


@mcp.tool()
def get_daily_spend(target_date: str) -> dict:
    """Daily spend, revenue, ROAS voor Google Ads."""
    if USE_MOCK:
        r = _rng(f"daily-{target_date}")
        spend = round(r.uniform(200, 800), 2)
        revenue = round(spend * r.uniform(1.5, 3.8), 2)
        return {
            "date": target_date,
            "customer_id": CUSTOMER_ID or "MOCK-CID",
            "spend": spend,
            "revenue": revenue,
            "roas": round(revenue / spend, 2),
            "clicks": r.randint(150, 800),
            "impressions": r.randint(8000, 45000),
            "conversions": r.randint(5, 45),
            "_mock": True,
        }
    raise NotImplementedError()


@mcp.tool()
def get_keyword_performance(target_date: str, limit: int = 25) -> dict:
    """Per-keyword performance."""
    if USE_MOCK:
        r = _rng(f"kw-{target_date}")
        keywords = ["edema relief", "swollen legs", "ems foot plate", "oregano oil", "nail fungus", "gum health"]
        kws = []
        for i in range(min(limit, 15)):
            spend = round(r.uniform(5, 80), 2)
            clicks = r.randint(5, 120)
            conversions = r.randint(0, 8)
            kws.append({
                "keyword": r.choice(keywords) + f" {i}",
                "match_type": r.choice(["exact", "phrase", "broad"]),
                "spend": spend,
                "clicks": clicks,
                "conversions": conversions,
                "cpc": round(spend / clicks, 2) if clicks else 0,
                "conv_rate": round(conversions / clicks * 100, 2) if clicks else 0,
            })
        return {"date": target_date, "keywords": kws, "_mock": True}
    raise NotImplementedError()


@mcp.tool()
def get_campaign_performance(target_date: str) -> dict:
    """Campaign-level metrics."""
    if USE_MOCK:
        r = _rng(f"cmp-{target_date}")
        return {
            "date": target_date,
            "campaigns": [
                {"id": "gcmp_001", "name": f"{BRAND.title()} - Search Branded", "spend": round(r.uniform(80, 200), 2), "conversions": r.randint(5, 25)},
                {"id": "gcmp_002", "name": f"{BRAND.title()} - Search Non-Branded", "spend": round(r.uniform(120, 350), 2), "conversions": r.randint(3, 18)},
                {"id": "gcmp_003", "name": f"{BRAND.title()} - Shopping", "spend": round(r.uniform(50, 150), 2), "conversions": r.randint(2, 12)},
            ],
            "_mock": True,
        }
    raise NotImplementedError()


@mcp.tool()
def get_search_terms(target_date: str, limit: int = 20) -> dict:
    """Search terms report — nieuwe keyword discoveries."""
    if USE_MOCK:
        r = _rng(f"st-{target_date}")
        terms = ["best edema cure", "home remedy swollen feet", "oregano oil benefits", "gum recession natural"]
        return {
            "date": target_date,
            "terms": [
                {"term": r.choice(terms) + f" {i}", "clicks": r.randint(1, 20), "conversions": r.randint(0, 3)}
                for i in range(min(limit, 10))
            ],
            "_mock": True,
        }
    raise NotImplementedError()


@mcp.tool()
def get_quality_scores() -> dict:
    """Quality scores per keyword (Google Ads only)."""
    if USE_MOCK:
        r = _rng("qs")
        return {
            "keywords": [
                {"keyword": f"mock keyword {i}", "quality_score": r.randint(4, 10)}
                for i in range(10)
            ],
            "_mock": True,
        }
    raise NotImplementedError()


if __name__ == "__main__":
    mcp.run()
