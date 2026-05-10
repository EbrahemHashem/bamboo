"""
Revolut Business MCP Server — FastMCP server voor Revolut Business API v1.0

Biedt 7 tools voor het beheren van Revolut Business accounts:
rekeningen, transacties, tegenpartijen, saldo-overzichten en wisselkoersen.
"""

import json
import os
from collections import defaultdict
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

# --- Config ---

REVOLUT_API_KEY: str = os.environ.get("REVOLUT_API_KEY", "")
REVOLUT_ENVIRONMENT: str = os.environ.get("REVOLUT_ENVIRONMENT", "sandbox")

BASE_URL: str = (
    "https://b2b.revolut.com/api/1.0"
    if REVOLUT_ENVIRONMENT == "production"
    else "https://sandbox-b2b.revolut.com/api/1.0"
)

mcp = FastMCP("revolut-business")


# --- Helpers ---


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {REVOLUT_API_KEY}",
        "Content-Type": "application/json",
    }


async def _get(path: str, params: dict | None = None) -> dict | list:
    """Execute a GET request against the Revolut Business API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/{path}",
            headers=_headers(),
            params=params or {},
        )
        if resp.status_code >= 400:
            try:
                data = resp.json()
                return {"error": data.get("message", str(data))}
            except Exception:
                return {"error": f"HTTP {resp.status_code}: {resp.text}"}
        return resp.json()


# ---------------------------------------------------------------------------
# 1. LIST ACCOUNTS
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_accounts() -> str:
    """Haal alle bankrekeningen op met saldo's uit Revolut Business."""
    result = await _get("accounts")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 2. GET ACCOUNT
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_account(account_id: str) -> str:
    """Haal details op van een specifieke bankrekening."""
    result = await _get(f"accounts/{account_id}")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 3. LIST TRANSACTIONS
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_transactions(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    account_id: Optional[str] = None,
    count: int = 50,
) -> str:
    """Haal transacties op, optioneel gefilterd op datum en rekening.

    from_date en to_date in ISO 8601 formaat (bijv. 2024-01-01).
    """
    params: dict = {"count": count}
    if from_date:
        params["from"] = from_date
    if to_date:
        params["to"] = to_date
    if account_id:
        params["account_id"] = account_id
    result = await _get("transactions", params)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 4. GET TRANSACTION
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_transaction(transaction_id: str) -> str:
    """Haal details op van een specifieke transactie."""
    result = await _get(f"transaction/{transaction_id}")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 5. LIST COUNTERPARTIES
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_counterparties() -> str:
    """Haal alle opgeslagen betaalontvangers (counterparties) op."""
    result = await _get("counterparties")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 6. GET BALANCE — sums all accounts by currency
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_balance() -> str:
    """Bereken het totale saldo per valuta over alle rekeningen."""
    accounts = await _get("accounts")
    if isinstance(accounts, dict) and "error" in accounts:
        return json.dumps(accounts, indent=2)

    totals: dict[str, float] = defaultdict(float)
    for acc in accounts:
        currency = acc.get("currency", "UNKNOWN")
        balance = acc.get("balance", 0)
        totals[currency] += balance

    summary = [
        {"currency": cur, "total_balance": round(bal, 2)}
        for cur, bal in sorted(totals.items())
    ]
    return json.dumps(summary, indent=2)


# ---------------------------------------------------------------------------
# 7. GET EXCHANGE RATES
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_exchange_rates(
    from_currency: str,
    to_currency: str,
    amount: float = 1.0,
) -> str:
    """Haal wisselkoersen op tussen twee valuta's.

    Bijv. from_currency='EUR', to_currency='USD', amount=100.
    """
    params = {
        "from": from_currency,
        "to": to_currency,
        "amount": amount,
    }
    result = await _get("rate", params)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
