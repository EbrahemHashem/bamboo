"""
HeyGen MCP Server — FastMCP server voor de HeyGen API

Biedt 8 tools voor het genereren van AI video's met HeyGen:
avatars, voices, video's aanmaken, status checken, templates.
"""

import json
import os
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

# --- Config ---

HEYGEN_API_KEY: str = os.environ.get("HEYGEN_API_KEY", "")
BASE_URL: str = "https://api.heygen.com"

mcp = FastMCP("heygen")


# --- Helpers ---


def _headers() -> dict[str, str]:
    return {
        "X-Api-Key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
    }


async def _get(path: str, params: dict | None = None) -> dict:
    """Execute a GET request against the HeyGen API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/{path}",
            headers=_headers(),
            params=params or {},
        )
        data = resp.json()
        if "error" in data:
            return {"error": data["error"] if isinstance(data["error"], str) else str(data["error"])}
        return data


async def _post(path: str, payload: dict) -> dict:
    """Execute a POST request against the HeyGen API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/{path}",
            headers=_headers(),
            json=payload,
        )
        data = resp.json()
        if "error" in data:
            return {"error": data["error"] if isinstance(data["error"], str) else str(data["error"])}
        return data


# ---------------------------------------------------------------------------
# 1  LIST AVATARS
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_avatars() -> str:
    """Lijst alle beschikbare AI avatars op in je HeyGen account."""
    result = await _get("v2/avatars")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 2  LIST VOICES
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_voices() -> str:
    """Lijst alle beschikbare stemmen op in je HeyGen account."""
    result = await _get("v2/voices")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 3  CREATE VIDEO
# ---------------------------------------------------------------------------


@mcp.tool()
async def create_video(
    avatar_id: str,
    voice_id: str,
    script: str,
    title: str = "AI Ad",
) -> str:
    """Maak een talking head video aan met een avatar, stem en script."""
    payload = {
        "video_inputs": [
            {
                "character": {
                    "type": "avatar",
                    "avatar_id": avatar_id,
                    "avatar_style": "normal",
                },
                "voice": {
                    "type": "text",
                    "voice_id": voice_id,
                    "input_text": script,
                },
            }
        ],
        "title": title,
    }
    result = await _post("v2/video/generate", payload)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 4  GET VIDEO STATUS
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_video_status(video_id: str) -> str:
    """Check de generatie-status van een video (pending, processing, completed, failed)."""
    result = await _get("v1/video_status.get", {"video_id": video_id})
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 5  LIST VIDEOS
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_videos(limit: int = 20) -> str:
    """Lijst gegenereerde video's op in je HeyGen account."""
    result = await _get("v1/video.list", {"limit": limit})
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 6  GET VIDEO (details + download URL)
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_video(video_id: str) -> str:
    """Haal video details op inclusief download URL."""
    result = await _get("v1/video_status.get", {"video_id": video_id})
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 7  LIST TEMPLATES
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_templates() -> str:
    """Lijst alle beschikbare video templates op."""
    result = await _get("v2/templates")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 8  CREATE VIDEO FROM TEMPLATE
# ---------------------------------------------------------------------------


@mcp.tool()
async def create_video_from_template(
    template_id: str,
    variables: str,
) -> str:
    """Genereer een video vanuit een template. variables als JSON string met template variabelen."""
    try:
        vars_dict = json.loads(variables)
    except json.JSONDecodeError:
        return json.dumps({"error": "variables moet een geldige JSON string zijn"})

    result = await _post(f"v2/template/{template_id}/generate", vars_dict)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
