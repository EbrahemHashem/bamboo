"""
Klaviyo MCP Server — FastMCP server voor de Klaviyo API v2024-10-15

Biedt 15 tools voor het beheren van Klaviyo e-mail marketing:
campagnes, flows, segmenten, lijsten, profielen, en metrics.
"""

import json
import os
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

# --- Config ---

KLAVIYO_API_KEY: str = os.environ.get("KLAVIYO_API_KEY", "")
BASE_URL: str = "https://a.klaviyo.com/api"

mcp = FastMCP("klaviyo")


# --- Helpers ---


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Klaviyo-API-Key {KLAVIYO_API_KEY}",
        "revision": "2024-10-15",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def _get(path: str, params: dict | None = None) -> dict:
    """Execute a GET request against the Klaviyo API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/{path}",
            headers=_headers(),
            params=params or {},
        )
        data = resp.json()
        if "errors" in data:
            return {"error": data["errors"]}
        return data


async def _post(path: str, payload: dict) -> dict:
    """Execute a POST request against the Klaviyo API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/{path}",
            headers=_headers(),
            json=payload,
        )
        data = resp.json()
        if "errors" in data:
            return {"error": data["errors"]}
        return data


# ---------------------------------------------------------------------------
# 1-2  CAMPAIGNS: list / get
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_campaigns(filter: Optional[str] = None) -> str:
    """Lijst alle campagnes op in Klaviyo. Optioneel filter meegeven (bijv. equals(messages.channel,'email'))."""
    params = {}
    if filter:
        params["filter"] = filter
    result = await _get("campaigns", params)
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_campaign(campaign_id: str) -> str:
    """Haal details op van een specifieke campagne."""
    result = await _get(f"campaigns/{campaign_id}")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 3-4  FLOWS: list / get
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_flows() -> str:
    """Lijst alle flows (automatiseringen) op in Klaviyo."""
    result = await _get("flows")
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_flow(flow_id: str) -> str:
    """Haal details op van een specifieke flow."""
    result = await _get(f"flows/{flow_id}")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 5-6  SEGMENTS: list / get profiles
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_segments() -> str:
    """Lijst alle segmenten op in Klaviyo."""
    result = await _get("segments")
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_segment_profiles(segment_id: str) -> str:
    """Haal alle profielen op uit een specifiek segment."""
    result = await _get(f"segments/{segment_id}/profiles")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 7-8  LISTS: list / get profiles
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_lists() -> str:
    """Lijst alle lijsten op in Klaviyo."""
    result = await _get("lists")
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_list_profiles(list_id: str) -> str:
    """Haal alle profielen op uit een specifieke lijst."""
    result = await _get(f"lists/{list_id}/profiles")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 9-10  METRICS: list / query aggregates
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_metrics() -> str:
    """Haal alle tracked events (metrics) op uit Klaviyo."""
    result = await _get("metrics")
    return json.dumps(result, indent=2)


@mcp.tool()
async def query_metric_aggregates(
    metric_id: str,
    measurement: str,
    interval: str,
    filter_str: str,
) -> str:
    """Query geaggregeerde metric data. measurement bijv. 'count', 'sum_value'. interval bijv. 'day', 'week'. filter_str bijv. 'greater-or-equal(datetime,2024-01-01)'."""
    payload = {
        "data": {
            "type": "metric-aggregate",
            "attributes": {
                "metric_id": metric_id,
                "measurements": [measurement],
                "interval": interval,
                "filter": [filter_str],
            },
        }
    }
    result = await _post("metric-aggregates", payload)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 11-12  PROFILES: list / get
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_profiles(filter: Optional[str] = None, page_size: int = 20) -> str:
    """Haal profielen op uit Klaviyo. Optioneel filter meegeven (bijv. equals(email,'test@example.com'))."""
    params: dict = {"page[size]": str(page_size)}
    if filter:
        params["filter"] = filter
    result = await _get("profiles", params)
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_profile(profile_id: str) -> str:
    """Haal details op van een specifiek profiel."""
    result = await _get(f"profiles/{profile_id}")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 13  CREATE CAMPAIGN
# ---------------------------------------------------------------------------


@mcp.tool()
async def create_campaign(
    name: str,
    list_id: str,
    subject: str,
    from_email: str,
    from_name: str,
) -> str:
    """Maak een nieuwe e-mail campagne aan in Klaviyo."""
    payload = {
        "data": {
            "type": "campaign",
            "attributes": {
                "name": name,
                "audiences": {
                    "included": [{"type": "list", "id": list_id}],
                    "excluded": [],
                },
                "campaign-messages": {
                    "data": [
                        {
                            "type": "campaign-message",
                            "attributes": {
                                "channel": "email",
                                "label": name,
                                "content": {
                                    "subject": subject,
                                    "from_email": from_email,
                                    "from_label": from_name,
                                },
                            },
                        }
                    ]
                },
                "send_strategy": {
                    "method": "immediate",
                },
            },
        }
    }
    result = await _post("campaigns", payload)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 14  FLOW MESSAGES
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_flow_messages(flow_id: str) -> str:
    """Haal alle berichten (messages) op van een specifieke flow."""
    result = await _get(f"flows/{flow_id}/flow-messages")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 15  CAMPAIGN METRICS (via include)
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_campaign_metrics(campaign_id: str) -> str:
    """Haal campagne op inclusief campaign-messages voor metrics/performance data."""
    params = {"include": "campaign-messages"}
    result = await _get(f"campaigns/{campaign_id}", params)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
