"""
Airwallex MCP Server — FastMCP server voor Airwallex API v1

Biedt 7 tools voor het beheren van Airwallex accounts:
balances, transacties, begunstigden, wisselkoersen en settlements.
"""

import json
import os
import time
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

# --- Config ---

AIRWALLEX_CLIENT_ID: str = os.environ.get("AIRWALLEX_CLIENT_ID", "")
AIRWALLEX_API_KEY: str = os.environ.get("AIRWALLEX_API_KEY", "")
AIRWALLEX_ENVIRONMENT: str = os.environ.get("AIRWALLEX_ENVIRONMENT", "demo")

BASE_URLS = {
    "demo": "https://api-demo.airwallex.com/api/v1",
    "production": "https://api.airwallex.com/api/v1",
}

AUTH_URLS = {
    "demo": "https://api-demo.airwallex.com/api/v1/authentication/login",
    "production": "https://api.airwallex.com/api/v1/authentication/login",
}

mcp = FastMCP("airwallex")

# --- Token cache ---

_token_cache: dict = {
    "token": None,
    "expires_at": 0.0,
}


async def _get_token() -> str:
    """Haal een bearer token op, of gebruik de cache als deze nog geldig is."""
    now = time.time()
    # Refresh 60 seconden voor expiry
    if _token_cache["token"] and _token_cache["expires_at"] > now + 60:
        return _token_cache["token"]

    auth_url = AUTH_URLS.get(AIRWALLEX_ENVIRONMENT, AUTH_URLS["demo"])
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            auth_url,
            headers={
                "x-client-id": AIRWALLEX_CLIENT_ID,
                "x-api-key": AIRWALLEX_API_KEY,
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    _token_cache["token"] = data["token"]
    # expires_at kan een ISO string of unix timestamp zijn
    expires_at = data.get("expires_at", "")
    if isinstance(expires_at, str) and expires_at:
        from datetime import datetime, timezone

        try:
            dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            _token_cache["expires_at"] = dt.timestamp()
        except ValueError:
            # Fallback: 30 minuten geldig
            _token_cache["expires_at"] = now + 1800
    elif isinstance(expires_at, (int, float)):
        _token_cache["expires_at"] = float(expires_at)
    else:
        _token_cache["expires_at"] = now + 1800

    return _token_cache["token"]


# --- Helpers ---


def _base_url() -> str:
    return BASE_URLS.get(AIRWALLEX_ENVIRONMENT, BASE_URLS["demo"])


async def _headers() -> dict[str, str]:
    token = await _get_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


async def _get(path: str, params: dict | None = None) -> dict:
    """Execute a GET request against the Airwallex API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{_base_url()}/{path}",
            headers=await _headers(),
            params=params or {},
        )
        data = resp.json()
        if resp.status_code >= 400:
            return {"error": data.get("message", str(data))}
        return data


async def _post(path: str, payload: dict) -> dict:
    """Execute a POST request against the Airwallex API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{_base_url()}/{path}",
            headers=await _headers(),
            json=payload,
        )
        data = resp.json()
        if resp.status_code >= 400:
            return {"error": data.get("message", str(data))}
        return data


# ---------------------------------------------------------------------------
# 1. LIST ACCOUNTS (balances)
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_accounts() -> str:
    """Haal alle account balances op uit Airwallex."""
    result = await _get("balances/current")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 2. GET BALANCE (single currency)
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_balance(currency: str) -> str:
    """Haal de balance op voor een specifieke valuta (bijv. EUR, USD, AED)."""
    result = await _get("balances/current", {"currency": currency.upper()})
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 3. LIST TRANSACTIONS
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_transactions(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    page_size: int = 20,
) -> str:
    """Lijst financiele transacties op. Datums in ISO formaat (YYYY-MM-DDThh:mm:ss+hh:mm)."""
    params: dict = {"page_size": page_size}
    if from_date:
        params["from_created_at"] = from_date
    if to_date:
        params["to_created_at"] = to_date
    result = await _get("financial_transactions", params)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 4. GET TRANSACTION
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_transaction(transaction_id: str) -> str:
    """Haal details op van een specifieke financiele transactie."""
    result = await _get(f"financial_transactions/{transaction_id}")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 5. LIST BENEFICIARIES
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_beneficiaries() -> str:
    """Lijst alle begunstigden (beneficiaries) op."""
    result = await _get("beneficiaries")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 6. GET EXCHANGE RATE
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_exchange_rate(
    sell_currency: str,
    buy_currency: str,
    amount: float,
) -> str:
    """Haal een wisselkoers quote op. Geef sell/buy valuta en bedrag op."""
    payload = {
        "sell_currency": sell_currency.upper(),
        "buy_currency": buy_currency.upper(),
        "sell_amount": amount,
    }
    result = await _post("fx/quotes/create", payload)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 7. LIST SETTLEMENTS
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_settlements(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
) -> str:
    """Lijst settlements op, optioneel gefilterd op datum."""
    params: dict = {}
    if from_date:
        params["from_settled_at"] = from_date
    if to_date:
        params["to_settled_at"] = to_date
    result = await _get("settlements", params)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
