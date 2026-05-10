"""
Shopify MCP Server — FastMCP server voor Shopify Admin REST API 2024-01

Biedt 12 tools voor het beheren van een Shopify store:
producten, orders, klanten, inventory, locaties, refunds en fulfillments.
"""

import json
import os
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

# --- Config ---

SHOPIFY_ACCESS_TOKEN: str = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
SHOPIFY_STORE_URL: str = os.environ.get("SHOPIFY_STORE_URL", "")  # e.g. "mystore.myshopify.com"
BASE_URL: str = f"https://{SHOPIFY_STORE_URL}/admin/api/2024-01"

mcp = FastMCP("shopify")


# --- Helpers ---


def _headers() -> dict[str, str]:
    return {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
    }


async def _get(path: str, params: dict | None = None) -> dict:
    """Execute a GET request against the Shopify Admin API."""
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
    """Execute a POST request against the Shopify Admin API."""
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


async def _put(path: str, payload: dict) -> dict:
    """Execute a PUT request against the Shopify Admin API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.put(
            f"{BASE_URL}/{path}",
            headers=_headers(),
            json=payload,
        )
        data = resp.json()
        if "errors" in data:
            return {"error": data["errors"]}
        return data


# ---------------------------------------------------------------------------
# 1-2  PRODUCTS: list / get
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_products(limit: int = 50, status: str = "active") -> str:
    """Lijst producten op in de Shopify store. Status: active, archived, draft."""
    result = await _get("products.json", {"limit": limit, "status": status})
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_product(product_id: str) -> str:
    """Haal details op van een specifiek product."""
    result = await _get(f"products/{product_id}.json")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 3-4  ORDERS: list / get
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_orders(
    status: str = "any",
    limit: int = 50,
    created_at_min: Optional[str] = None,
) -> str:
    """Lijst orders op. Status: open, closed, cancelled, any. created_at_min in ISO 8601 formaat."""
    params: dict = {"status": status, "limit": limit}
    if created_at_min:
        params["created_at_min"] = created_at_min
    result = await _get("orders.json", params)
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_order(order_id: str) -> str:
    """Haal details op van een specifieke order."""
    result = await _get(f"orders/{order_id}.json")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 5-6  CUSTOMERS: list / get
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_customers(limit: int = 50, query: Optional[str] = None) -> str:
    """Lijst klanten op, of zoek klanten met een query string."""
    if query:
        result = await _get("customers/search.json", {"query": query, "limit": limit})
    else:
        result = await _get("customers.json", {"limit": limit})
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_customer(customer_id: str) -> str:
    """Haal details op van een specifieke klant."""
    result = await _get(f"customers/{customer_id}.json")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 7-8  INVENTORY & LOCATIONS
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_inventory_levels(location_id: Optional[str] = None) -> str:
    """Haal inventory levels op, optioneel gefilterd op location_id."""
    params: dict = {}
    if location_id:
        params["location_ids"] = location_id
    result = await _get("inventory_levels.json", params)
    return json.dumps(result, indent=2)


@mcp.tool()
async def list_locations() -> str:
    """Lijst alle locaties op in de Shopify store."""
    result = await _get("locations.json")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 9  REFUNDS: create (calculate first, then create)
# ---------------------------------------------------------------------------


@mcp.tool()
async def create_refund(order_id: str, line_items: str, note: str = "") -> str:
    """Maak een refund aan voor een order. line_items als JSON array string,
    bijv. '[{"line_item_id": "123", "quantity": 1}]'.
    Berekent eerst de refund, en maakt deze daarna aan."""
    try:
        items = json.loads(line_items)
    except json.JSONDecodeError:
        return json.dumps({"error": "line_items is geen geldige JSON array."})

    # Step 1: Calculate the refund
    calc_payload = {
        "refund": {
            "refund_line_items": [
                {"line_item_id": item["line_item_id"], "quantity": item["quantity"]}
                for item in items
            ],
        }
    }
    calc_result = await _post(f"orders/{order_id}/refunds/calculate.json", calc_payload)
    if "error" in calc_result:
        return json.dumps(calc_result, indent=2)

    # Step 2: Create the refund using calculated transactions
    calculated_refund = calc_result.get("refund", {})
    transactions = calculated_refund.get("transactions", [])

    refund_payload = {
        "refund": {
            "note": note,
            "refund_line_items": [
                {"line_item_id": item["line_item_id"], "quantity": item["quantity"]}
                for item in items
            ],
            "transactions": [
                {
                    "parent_id": t.get("parent_id"),
                    "amount": t.get("amount"),
                    "kind": "refund",
                    "gateway": t.get("gateway"),
                }
                for t in transactions
            ],
        }
    }
    result = await _post(f"orders/{order_id}/refunds.json", refund_payload)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 10  PRODUCTS: update
# ---------------------------------------------------------------------------


@mcp.tool()
async def update_product(product_id: str, updates: str) -> str:
    """Update een product. updates als JSON string met velden om te wijzigen,
    bijv. '{"title": "Nieuw", "status": "active"}'."""
    try:
        update_data = json.loads(updates)
    except json.JSONDecodeError:
        return json.dumps({"error": "updates is geen geldige JSON string."})

    payload = {"product": update_data}
    result = await _put(f"products/{product_id}.json", payload)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 11  FULFILLMENTS: get order fulfillments
# ---------------------------------------------------------------------------


@mcp.tool()
async def get_order_fulfillments(order_id: str) -> str:
    """Haal alle fulfillments op voor een specifieke order."""
    result = await _get(f"orders/{order_id}/fulfillments.json")
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# 12  ORDERS: count
# ---------------------------------------------------------------------------


@mcp.tool()
async def count_orders(
    status: str = "any",
    created_at_min: Optional[str] = None,
) -> str:
    """Tel het aantal orders. Status: open, closed, cancelled, any."""
    params: dict = {"status": status}
    if created_at_min:
        params["created_at_min"] = created_at_min
    result = await _get("orders/count.json", params)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
