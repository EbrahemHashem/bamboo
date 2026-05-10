"""
CJ Fulfillment MCP Server — FastMCP server for CJ Dropshipping API

Tools for inventory levels, product sourcing, order management,
and shipment tracking via CJ's REST API.
"""

import json
import os
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

# --- Config ---

CJ_API_KEY: str = os.environ.get("CJ_API_KEY", "")
CJ_EMAIL: str = os.environ.get("CJ_EMAIL", "")
BASE_URL: str = "https://developers.cjdropshipping.com/api2.0/v1"

mcp = FastMCP("cj-fulfillment")

# --- Auth ---

_access_token: str = ""


async def _authenticate() -> str:
    """Get CJ access token using API key."""
    global _access_token
    if _access_token:
        return _access_token
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/authentication/getAccessToken",
            json={"email": CJ_EMAIL, "password": CJ_API_KEY},
        )
        data = resp.json()
        if data.get("result"):
            _access_token = data["data"]["accessToken"]
            return _access_token
        return ""


async def _headers() -> dict[str, str]:
    token = await _authenticate()
    return {"CJ-Access-Token": token, "Content-Type": "application/json"}


async def _get(path: str, params: dict | None = None) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/{path}",
            headers=await _headers(),
            params=params or {},
        )
        data = resp.json()
        if not data.get("result"):
            return {"error": data.get("message", "Unknown error")}
        return data.get("data", data)


async def _post(path: str, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{BASE_URL}/{path}",
            headers=await _headers(),
            json=payload,
        )
        data = resp.json()
        if not data.get("result"):
            return {"error": data.get("message", "Unknown error")}
        return data.get("data", data)


# --- Tools ---


@mcp.tool()
async def list_products(
    category_id: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> str:
    """List products from CJ catalog. Filter by category."""
    params: dict = {"pageNum": page, "pageSize": page_size}
    if category_id:
        params["categoryId"] = category_id
    result = await _get("product/list", params)
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_product(product_id: str) -> str:
    """Get detailed product info including variants, images, and pricing."""
    result = await _get(f"product/query", {"pid": product_id})
    return json.dumps(result, indent=2)


@mcp.tool()
async def search_products(query: str, page: int = 1, page_size: int = 20) -> str:
    """Search CJ product catalog by keyword."""
    result = await _post(
        "product/list",
        {"productNameEn": query, "pageNum": page, "pageSize": page_size},
    )
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_inventory(variant_id: str) -> str:
    """Check inventory/stock level for a specific product variant."""
    result = await _get("product/stock", {"vid": variant_id})
    return json.dumps(result, indent=2)


@mcp.tool()
async def create_order(
    product_id: str,
    variant_id: str,
    quantity: int,
    shipping_name: str,
    shipping_address: str,
    shipping_city: str,
    shipping_province: str,
    shipping_country: str,
    shipping_zip: str,
    shipping_phone: str,
) -> str:
    """Create a new fulfillment order with CJ."""
    result = await _post(
        "shopping/order/createOrder",
        {
            "orderNumber": f"AUTO-{product_id[:8]}",
            "products": [
                {"vid": variant_id, "quantity": quantity}
            ],
            "address": {
                "customerName": shipping_name,
                "streetAddress1": shipping_address,
                "city": shipping_city,
                "province": shipping_province,
                "country": shipping_country,
                "zip": shipping_zip,
                "phone": shipping_phone,
            },
        },
    )
    return json.dumps(result, indent=2)


@mcp.tool()
async def list_orders(page: int = 1, page_size: int = 20) -> str:
    """List all CJ fulfillment orders."""
    result = await _get("shopping/order/list", {"pageNum": page, "pageSize": page_size})
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_order(order_id: str) -> str:
    """Get details for a specific CJ order."""
    result = await _get("shopping/order/getOrderDetail", {"orderId": order_id})
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_tracking(order_id: str) -> str:
    """Get shipment tracking info for a CJ order."""
    result = await _get("logistic/getTrackInfo", {"orderId": order_id})
    return json.dumps(result, indent=2)


@mcp.tool()
async def list_categories() -> str:
    """List all product categories in CJ catalog."""
    result = await _get("product/getCategory")
    return json.dumps(result, indent=2)


@mcp.tool()
async def get_shipping_methods(
    product_id: str, country_code: str, quantity: int = 1
) -> str:
    """Get available shipping methods and costs for a product to a country."""
    result = await _post(
        "logistic/freightCalculate",
        {
            "startCountryCode": "CN",
            "endCountryCode": country_code,
            "products": [{"quantity": quantity, "pid": product_id}],
        },
    )
    return json.dumps(result, indent=2)


# --- Entry ---

if __name__ == "__main__":
    mcp.run()
