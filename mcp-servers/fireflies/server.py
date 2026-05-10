"""
Fireflies.ai MCP Server — FastMCP server voor Fireflies GraphQL API

Biedt 6 tools voor het ophalen en doorzoeken van meeting transcripts:
lijst, detail, zoeken, samenvatting, recente meetings, en actie-items.
"""

import json
import os
from datetime import datetime, timedelta, timezone

import httpx
from mcp.server.fastmcp import FastMCP

# --- Config ---

FIREFLIES_API_KEY: str = os.environ.get("FIREFLIES_API_KEY", "")
GRAPHQL_URL: str = "https://api.fireflies.ai/graphql"

mcp = FastMCP("fireflies")


# --- Helpers ---


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {FIREFLIES_API_KEY}",
        "Content-Type": "application/json",
    }


async def _graphql(query: str, variables: dict | None = None) -> dict:
    """Execute a GraphQL request against the Fireflies API."""
    payload: dict = {"query": query}
    if variables:
        payload["variables"] = variables

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            GRAPHQL_URL,
            headers=_headers(),
            json=payload,
        )
        data = resp.json()
        if "errors" in data:
            return {"error": [e.get("message", str(e)) for e in data["errors"]]}
        return data.get("data", data)


# ---------------------------------------------------------------------------
# 1  LIST TRANSCRIPTS
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_transcripts(limit: int = 20) -> str:
    """Lijst de meest recente meeting transcripts op."""
    query = """
    query ListTranscripts($limit: Int) {
        transcripts(limit: $limit) {
            id
            title
            date
            duration
            organizer_email
            participants
            sentences {
                speaker_name
                text
            }
            summary {
                overview
                action_items
            }
        }
    }
    """
    result = await _graphql(query, {"limit": limit})
    return json.dumps(result, indent=2, default=str)


# ---------------------------------------------------------------------------
# 2  GET TRANSCRIPT
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_transcript(transcript_id: str) -> str:
    """Haal een volledig transcript op met alle details."""
    query = """
    query GetTranscript($id: String!) {
        transcript(id: $id) {
            id
            title
            date
            duration
            organizer_email
            participants
            sentences {
                speaker_name
                text
                start_time
                end_time
            }
            summary {
                overview
                action_items
                outline
                keywords
            }
        }
    }
    """
    result = await _graphql(query, {"id": transcript_id})
    return json.dumps(result, indent=2, default=str)


# ---------------------------------------------------------------------------
# 3  SEARCH TRANSCRIPTS
# ---------------------------------------------------------------------------


@mcp.tool()
async def search_transcripts(query: str) -> str:
    """Zoek door transcripts op basis van een zoekterm."""
    gql = """
    query SearchTranscripts($query: String!) {
        transcripts(search: $query) {
            id
            title
            date
            duration
        }
    }
    """
    result = await _graphql(gql, {"query": query})
    return json.dumps(result, indent=2, default=str)


# ---------------------------------------------------------------------------
# 4  GET TRANSCRIPT SUMMARY
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_transcript_summary(transcript_id: str) -> str:
    """Haal alleen de samenvatting en actie-items op van een transcript."""
    query = """
    query GetTranscriptSummary($id: String!) {
        transcript(id: $id) {
            id
            title
            date
            summary {
                overview
                action_items
            }
        }
    }
    """
    result = await _graphql(query, {"id": transcript_id})
    return json.dumps(result, indent=2, default=str)


# ---------------------------------------------------------------------------
# 5  GET RECENT MEETINGS
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_recent_meetings(days: int = 7) -> str:
    """Lijst transcripts op van de afgelopen N dagen."""
    # Calculate the cutoff date as Unix timestamp (ms)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_ms = int(cutoff.timestamp() * 1000)

    # Fireflies returns date as ms timestamp — fetch a batch and filter
    query = """
    query RecentMeetings($limit: Int) {
        transcripts(limit: $limit) {
            id
            title
            date
            duration
            organizer_email
            participants
            summary {
                overview
                action_items
            }
        }
    }
    """
    result = await _graphql(query, {"limit": 100})

    if "error" in result:
        return json.dumps(result, indent=2, default=str)

    transcripts = result.get("transcripts", [])
    recent = []
    for t in transcripts:
        t_date = t.get("date")
        if t_date is not None:
            # Fireflies date can be ms timestamp (int/float) or string
            try:
                ts = int(float(t_date))
            except (ValueError, TypeError):
                continue
            if ts >= cutoff_ms:
                recent.append(t)

    return json.dumps({"transcripts": recent, "count": len(recent), "days": days}, indent=2, default=str)


# ---------------------------------------------------------------------------
# 6  GET MEETING ACTION ITEMS
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_meeting_action_items(transcript_id: str) -> str:
    """Haal de actie-items op van een specifieke meeting."""
    query = """
    query GetActionItems($id: String!) {
        transcript(id: $id) {
            id
            title
            date
            summary {
                action_items
            }
        }
    }
    """
    result = await _graphql(query, {"id": transcript_id})

    if "error" in result:
        return json.dumps(result, indent=2, default=str)

    transcript = result.get("transcript", {})
    action_items = (transcript.get("summary") or {}).get("action_items", [])

    return json.dumps(
        {
            "transcript_id": transcript.get("id"),
            "title": transcript.get("title"),
            "date": transcript.get("date"),
            "action_items": action_items,
        },
        indent=2,
        default=str,
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
