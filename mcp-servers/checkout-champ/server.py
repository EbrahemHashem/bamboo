"""
Checkout Champ MCP Server — FastMCP server for Checkout Champ API

Tools for order management, subscription tracking, customer data,
and funnel analytics via Checkout Champ's REST API.
"""

import json
import os
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

# --- Config ---

CC_API_KEY: str = os.environ.get("CHECKOUT_CHAMP_API_KEY", "")
CC_DOMAIN: str = os.environ.get("CHECKOUT_CHAMP_DOMAIN", "")
BASE_URL: str = f"https://{CC_DOMAIN}/api/v1" if CC_DOMAIN else ""

mcp = FastMCP("checkout-champ")


# --- Helpers ---


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {CC_API_KEY}", "Content-Type": "application/json"}


async def _get(path: str, params: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/{path}",
            headers=_headers(),
            params=params or {},
        )
        data = resp.json()
        if "error" in data:
            return {"error": data.get("error", "Unknown error")}
        return data


async def _post(path: str, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/{path}",
            headers=_headers(),
            json=payload,
        )
        data = resp.json()
        if "error" in data:
            return {"error": data.get("error", "Unknown error")}
        return data


# --- Tools ---


@mcp.tool()
async def list_orders(
    page: int = 1,
    per_page: int = 50,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> str:
    """List orders with optional filters. Status: pending, approved, declined, refunded."""
    params: dict = {"page": page, "per_page": per_page}
    if status:
        params["status"] = status
    if date_from:
        params["date_from"] = date_from
    if date_to:
        params["date_to"] = date_to
    result = await _get("orders", params)
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_order(order_id: str) -> str:
    """Get full details for a specific order including line items and customer."""
    result = await _get(f"orders/{order_id}")
    return json.dumps(result, indent=2)


@mcp.tool()
async def list_subscriptions(
    page: int = 1,
    per_page: int = 50,
    status: Optional[str] = None,
) -> str:
    """List subscriptions. Status: active, cancelled, paused."""
    params: dict = {"page": page, "per_page": per_page}
    if status:
        params["status"] = status
    result = await _get("subscriptions", params)
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_subscription(subscription_id: str) -> str:
    """Get details for a specific subscription."""
    result = await _get(f"subscriptions/{subscription_id}")
    return json.dumps(result, indent=2)


@mcp.tool()
async def cancel_subscription(subscription_id: str, reason: str = "") -> str:
    """Cancel an active subscription."""
    result = await _post(
        f"subscriptions/{subscription_id}/cancel",
        {"reason": reason},
    )
    return json.dumps(result, indent=2)


@mcp.tool()
async def list_customers(
    page: int = 1,
    per_page: int = 50,
    search: Optional[str] = None,
) -> str:
    """List customers. Search by name or email."""
    params: dict = {"page": page, "per_page": per_page}
    if search:
        params["search"] = search
    result = await _get("customers", params)
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_customer(customer_id: str) -> str:
    """Get full customer profile including orders and subscriptions."""
    result = await _get(f"customers/{customer_id}")
    return json.dumps(result, indent=2)


@mcp.tool()
async def list_products(page: int = 1, per_page: int = 50) -> str:
    """List all products in Checkout Champ."""
    result = await _get("products", {"page": page, "per_page": per_page})
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_product(product_id: str) -> str:
    """Get product details including variants and pricing."""
    result = await _get(f"products/{product_id}")
    return json.dumps(result, indent=2)


@mcp.tool()
async def process_refund(order_id: str, amount: Optional[float] = None, reason: str = "") -> str:
    """Process a refund for an order. If no amount, full refund."""
    payload: dict = {"reason": reason}
    if amount is not None:
        payload["amount"] = amount
    result = await _post(f"orders/{order_id}/refund", payload)
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_transactions(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
) -> str:
    """List payment transactions with date range filter."""
    params: dict = {"page": page, "per_page": per_page}
    if date_from:
        params["date_from"] = date_from
    if date_to:
        params["date_to"] = date_to
    result = await _get("transactions", params)
    return json.dumps(result, indent=2)


# --- Entry ---

if __name__ == "__main__":
    mcp.run()
