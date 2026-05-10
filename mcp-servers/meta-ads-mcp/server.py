"""
Meta Ads MCP Server — FastMCP server voor Meta Marketing API v21.0

Biedt 15 tools voor het beheren van Meta (Facebook) advertenties:
campagnes, ad sets, ads, insights, en custom audiences.
"""

import json
import os
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

# --- Config ---

META_ACCESS_TOKEN: str = os.environ.get("META_ACCESS_TOKEN", "")
META_AD_ACCOUNT_ID: str = os.environ.get("META_AD_ACCOUNT_ID", "")  # must include "act_" prefix
BASE_URL: str = "https://graph.facebook.com/v21.0"

INSIGHTS_FIELDS: str = (
    "spend,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type"
)

mcp = FastMCP("meta-ads")


# --- Helpers ---


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {META_ACCESS_TOKEN}"}


async def _get(path: str, params: dict | None = None) -> dict:
    """Execute a GET request against the Meta Marketing API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/{path}",
            headers=_headers(),
            params=params or {},
        )
        data = resp.json()
        if "error" in data:
            return {"error": data["error"].get("message", str(data["error"]))}
        return data


async def _post(path: str, payload: dict) -> dict:
    """Execute a POST request against the Meta Marketing API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/{path}",
            headers=_headers(),
            data=payload,
        )
        data = resp.json()
        if "error" in data:
            return {"error": data["error"].get("message", str(data["error"]))}
        return data


# ---------------------------------------------------------------------------
# 1-3  LIST: campaigns / adsets / ads
# ---------------------------------------------------------------------------


@mcp.tool()
async def meta_list_campaigns() -> str:
    """Lijst alle campagnes op in het Meta Ads account."""
    fields = "name,status,objective,daily_budget,lifetime_budget,created_time"
    result = await _get(
        f"{META_AD_ACCOUNT_ID}/campaigns",
        {"fields": fields, "limit": 100},
    )
    return json.dumps(result, indent=2)


@mcp.tool()
async def meta_list_adsets(campaign_id: Optional[str] = None) -> str:
    """Lijst ad sets op, optioneel gefilterd op campaign_id."""
    fields = "name,status,targeting,daily_budget,optimization_goal"
    if campaign_id:
        path = f"{campaign_id}/adsets"
    else:
        path = f"{META_AD_ACCOUNT_ID}/adsets"
    result = await _get(path, {"fields": fields, "limit": 100})
    return json.dumps(result, indent=2)


@mcp.tool()
async def meta_list_ads(adset_id: Optional[str] = None) -> str:
    """Lijst ads op, optioneel gefilterd op adset_id."""
    fields = "name,status,creative,created_time"
    if adset_id:
        path = f"{adset_id}/ads"
    else:
        path = f"{META_AD_ACCOUNT_ID}/ads"
    result = await _get(path, {"fields": fields, "limit": 100})
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 4-7  INSIGHTS: account / campaign / adset / ad
# ---------------------------------------------------------------------------


@mcp.tool()
async def meta_account_insights(date_preset: str = "last_30d") -> str:
    """Haal account-niveau insights op (spend, clicks, ctr, etc.)."""
    result = await _get(
        f"{META_AD_ACCOUNT_ID}/insights",
        {"fields": INSIGHTS_FIELDS, "date_preset": date_preset},
    )
    return json.dumps(result, indent=2)


@mcp.tool()
async def meta_campaign_insights(
    campaign_id: str, date_preset: str = "last_30d"
) -> str:
    """Haal insights op voor een specifieke campagne."""
    result = await _get(
        f"{campaign_id}/insights",
        {"fields": INSIGHTS_FIELDS, "date_preset": date_preset},
    )
    return json.dumps(result, indent=2)


@mcp.tool()
async def meta_adset_insights(
    adset_id: str, date_preset: str = "last_30d"
) -> str:
    """Haal insights op voor een specifieke ad set."""
    result = await _get(
        f"{adset_id}/insights",
        {"fields": INSIGHTS_FIELDS, "date_preset": date_preset},
    )
    return json.dumps(result, indent=2)


@mcp.tool()
async def meta_ad_insights(
    ad_id: str, date_preset: str = "last_30d"
) -> str:
    """Haal insights op voor een specifieke ad."""
    result = await _get(
        f"{ad_id}/insights",
        {"fields": INSIGHTS_FIELDS, "date_preset": date_preset},
    )
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 8-9  CREATE / UPDATE campaigns
# ---------------------------------------------------------------------------


@mcp.tool()
async def meta_create_campaign(
    name: str,
    objective: str = "OUTCOME_LEADS",
    status: str = "PAUSED",
    special_ad_categories: str = "[]",
) -> str:
    """Maak een nieuwe campagne aan. special_ad_categories als JSON array string."""
    payload = {
        "name": name,
        "objective": objective,
        "status": status,
        "special_ad_categories": special_ad_categories,
    }
    result = await _post(f"{META_AD_ACCOUNT_ID}/campaigns", payload)
    return json.dumps(result, indent=2)


@mcp.tool()
async def meta_update_campaign(
    campaign_id: str,
    name: Optional[str] = None,
    status: Optional[str] = None,
    daily_budget: Optional[str] = None,
) -> str:
    """Update een bestaande campagne (naam, status, of daily_budget)."""
    payload: dict[str, str] = {}
    if name is not None:
        payload["name"] = name
    if status is not None:
        payload["status"] = status
    if daily_budget is not None:
        payload["daily_budget"] = daily_budget
    if not payload:
        return json.dumps({"error": "Geen velden opgegeven om te updaten."})
    result = await _post(campaign_id, payload)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 10-11  CREATE / UPDATE ad sets
# ---------------------------------------------------------------------------


@mcp.tool()
async def meta_create_adset(
    campaign_id: str,
    name: str,
    daily_budget: str,
    optimization_goal: str,
    targeting: str,
    billing_event: str = "IMPRESSIONS",
    status: str = "PAUSED",
) -> str:
    """Maak een nieuwe ad set aan. targeting als JSON string."""
    payload = {
        "campaign_id": campaign_id,
        "name": name,
        "daily_budget": daily_budget,
        "optimization_goal": optimization_goal,
        "targeting": targeting,
        "billing_event": billing_event,
        "status": status,
    }
    result = await _post(f"{META_AD_ACCOUNT_ID}/adsets", payload)
    return json.dumps(result, indent=2)


@mcp.tool()
async def meta_update_adset(
    adset_id: str,
    name: Optional[str] = None,
    status: Optional[str] = None,
    daily_budget: Optional[str] = None,
    targeting: Optional[str] = None,
) -> str:
    """Update een bestaande ad set."""
    payload: dict[str, str] = {}
    if name is not None:
        payload["name"] = name
    if status is not None:
        payload["status"] = status
    if daily_budget is not None:
        payload["daily_budget"] = daily_budget
    if targeting is not None:
        payload["targeting"] = targeting
    if not payload:
        return json.dumps({"error": "Geen velden opgegeven om te updaten."})
    result = await _post(adset_id, payload)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 12-13  CREATE / UPDATE ads
# ---------------------------------------------------------------------------


@mcp.tool()
async def meta_create_ad(
    adset_id: str,
    name: str,
    creative: str,
    status: str = "PAUSED",
) -> str:
    """Maak een nieuwe ad aan. creative als JSON string met page_id, image_hash/video_id, message, link."""
    payload = {
        "adset_id": adset_id,
        "name": name,
        "creative": creative,
        "status": status,
    }
    result = await _post(f"{META_AD_ACCOUNT_ID}/ads", payload)
    return json.dumps(result, indent=2)


@mcp.tool()
async def meta_update_ad(
    ad_id: str,
    name: Optional[str] = None,
    status: Optional[str] = None,
    creative: Optional[str] = None,
) -> str:
    """Update een bestaande ad."""
    payload: dict[str, str] = {}
    if name is not None:
        payload["name"] = name
    if status is not None:
        payload["status"] = status
    if creative is not None:
        payload["creative"] = creative
    if not payload:
        return json.dumps({"error": "Geen velden opgegeven om te updaten."})
    result = await _post(ad_id, payload)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 14-15  AUDIENCES: list / create
# ---------------------------------------------------------------------------


@mcp.tool()
async def meta_list_audiences() -> str:
    """Lijst alle custom audiences op."""
    fields = "name,approximate_count,data_source,delivery_status"
    result = await _get(
        f"{META_AD_ACCOUNT_ID}/customaudiences",
        {"fields": fields, "limit": 100},
    )
    return json.dumps(result, indent=2)


@mcp.tool()
async def meta_create_audience(
    name: str,
    description: str,
    subtype: str = "CUSTOM",
) -> str:
    """Maak een nieuwe custom audience aan."""
    payload = {
        "name": name,
        "description": description,
        "subtype": subtype,
    }
    result = await _post(f"{META_AD_ACCOUNT_ID}/customaudiences", payload)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
