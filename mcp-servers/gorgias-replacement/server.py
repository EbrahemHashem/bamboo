"""
Gorgias Replacement MCP Server — AI-powered customer service email system

Replaces Gorgias with a custom email intake system:
- Reads incoming customer emails via IMAP
- AI triages and classifies tickets
- Auto-responds to standard queries
- Escalates complex cases
- Integrates with Shopify for order data
"""

import json
import os
import imaplib
import email
from email.mime.text import MIMEText
import smtplib
from typing import Optional
from datetime import datetime, timedelta

import httpx
from mcp.server.fastmcp import FastMCP

# --- Config ---

CS_EMAIL: str = os.environ.get("CS_EMAIL_ADDRESS", "")
CS_PASSWORD: str = os.environ.get("CS_EMAIL_APP_PASSWORD", "")
IMAP_SERVER: str = os.environ.get("CS_IMAP_SERVER", "imap.gmail.com")
SMTP_SERVER: str = os.environ.get("CS_SMTP_SERVER", "smtp.gmail.com")
SHOPIFY_TOKEN: str = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
SHOPIFY_STORE: str = os.environ.get("SHOPIFY_STORE_URL", "")

mcp = FastMCP("gorgias-replacement")


# --- Helpers ---


def _connect_imap():
    """Connect to IMAP server."""
    mail = imaplib.IMAP4_SSL(IMAP_SERVER)
    mail.login(CS_EMAIL, CS_PASSWORD)
    return mail


def _parse_email(msg) -> dict:
    """Parse email message into structured dict."""
    subject = ""
    for part in email.header.decode_header(msg["Subject"] or ""):
        if isinstance(part[0], bytes):
            subject += part[0].decode(part[1] or "utf-8", errors="replace")
        else:
            subject += str(part[0])

    from_addr = msg["From"] or ""
    date_str = msg["Date"] or ""

    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    body = payload.decode("utf-8", errors="replace")
                    break
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode("utf-8", errors="replace")

    return {
        "from": from_addr,
        "subject": subject,
        "date": date_str,
        "body": body[:2000],
    }


async def _shopify_get(path: str) -> dict:
    """Make a GET request to Shopify Admin API."""
    if not SHOPIFY_TOKEN or not SHOPIFY_STORE:
        return {"error": "Shopify not configured"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"https://{SHOPIFY_STORE}/admin/api/2024-01/{path}",
            headers={
                "X-Shopify-Access-Token": SHOPIFY_TOKEN,
                "Content-Type": "application/json",
            },
        )
        return resp.json()


# --- Tools ---


@mcp.tool()
async def get_unread_tickets(limit: int = 20) -> str:
    """Fetch unread customer emails (tickets). Returns sender, subject, body, date."""
    try:
        mail = _connect_imap()
        mail.select("INBOX")
        _, message_ids = mail.search(None, "UNSEEN")
        ids = message_ids[0].split()[-limit:] if message_ids[0] else []

        tickets = []
        for mid in ids:
            _, msg_data = mail.fetch(mid, "(RFC822)")
            msg = email.message_from_bytes(msg_data[0][1])
            parsed = _parse_email(msg)
            parsed["id"] = mid.decode()
            tickets.append(parsed)

        mail.logout()
        return json.dumps({"tickets": tickets, "count": len(tickets)}, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
async def get_all_tickets(days: int = 7, limit: int = 50) -> str:
    """Fetch all customer emails from the last N days."""
    try:
        mail = _connect_imap()
        mail.select("INBOX")
        since = (datetime.now() - timedelta(days=days)).strftime("%d-%b-%Y")
        _, message_ids = mail.search(None, f'(SINCE {since})')
        ids = message_ids[0].split()[-limit:] if message_ids[0] else []

        tickets = []
        for mid in ids:
            _, msg_data = mail.fetch(mid, "(RFC822)")
            msg = email.message_from_bytes(msg_data[0][1])
            parsed = _parse_email(msg)
            parsed["id"] = mid.decode()
            tickets.append(parsed)

        mail.logout()
        return json.dumps({"tickets": tickets, "count": len(tickets)}, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
async def classify_ticket(ticket_subject: str, ticket_body: str) -> str:
    """Classify a customer ticket by type. Returns suggested category and priority.

    Categories: order_status, return_request, refund_request, product_question,
    shipping_issue, complaint, compliment, spam, other.
    Priority: high, medium, low.
    """
    body_lower = (ticket_subject + " " + ticket_body).lower()

    category = "other"
    priority = "medium"

    if any(w in body_lower for w in ["refund", "money back", "charge back", "chargeback"]):
        category = "refund_request"
        priority = "high"
    elif any(w in body_lower for w in ["return", "send back", "exchange"]):
        category = "return_request"
        priority = "medium"
    elif any(w in body_lower for w in ["where is my order", "tracking", "shipping", "delivery", "shipped"]):
        category = "order_status"
        priority = "medium"
    elif any(w in body_lower for w in ["complaint", "terrible", "worst", "disgusting", "lawsuit", "lawyer"]):
        category = "complaint"
        priority = "high"
    elif any(w in body_lower for w in ["love", "amazing", "great", "thank you so much"]):
        category = "compliment"
        priority = "low"
    elif any(w in body_lower for w in ["unsubscribe", "remove", "stop emailing"]):
        category = "spam"
        priority = "low"
    elif any(w in body_lower for w in ["how to", "does it", "ingredient", "product", "what is"]):
        category = "product_question"
        priority = "low"
    elif any(w in body_lower for w in ["not received", "damaged", "broken", "wrong item"]):
        category = "shipping_issue"
        priority = "high"

    return json.dumps({
        "category": category,
        "priority": priority,
        "auto_respond": category in ["order_status", "product_question", "compliment", "spam"],
        "escalate": priority == "high",
    }, indent=2)


@mcp.tool()
async def lookup_order(order_identifier: str) -> str:
    """Look up a Shopify order by order number or email. Returns order details, tracking, status."""
    if order_identifier.startswith("#"):
        order_identifier = order_identifier[1:]

    if "@" in order_identifier:
        result = await _shopify_get(f"orders.json?email={order_identifier}&status=any&limit=5")
    else:
        result = await _shopify_get(f"orders.json?name=%23{order_identifier}&status=any")

    if "orders" in result:
        orders = []
        for o in result["orders"]:
            orders.append({
                "id": o["id"],
                "name": o["name"],
                "email": o.get("email", ""),
                "status": o["financial_status"],
                "fulfillment": o["fulfillment_status"] or "unfulfilled",
                "total": o["total_price"],
                "currency": o["currency"],
                "created": o["created_at"],
                "line_items": [
                    {"title": li["title"], "quantity": li["quantity"]}
                    for li in o["line_items"]
                ],
            })
        return json.dumps({"orders": orders}, indent=2)
    return json.dumps(result, indent=2)


@mcp.tool()
async def send_reply(
    to_email: str,
    subject: str,
    body: str,
) -> str:
    """Send a reply email to a customer. Body should be plain text."""
    try:
        msg = MIMEText(body, "plain")
        msg["Subject"] = subject
        msg["From"] = CS_EMAIL
        msg["To"] = to_email

        with smtplib.SMTP_SSL(SMTP_SERVER, 465) as server:
            server.login(CS_EMAIL, CS_PASSWORD)
            server.send_message(msg)

        return json.dumps({"success": True, "sent_to": to_email, "subject": subject})
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
async def get_ticket_stats(days: int = 7) -> str:
    """Get ticket volume stats for the last N days."""
    try:
        mail = _connect_imap()
        mail.select("INBOX")
        since = (datetime.now() - timedelta(days=days)).strftime("%d-%b-%Y")
        _, all_ids = mail.search(None, f'(SINCE {since})')
        _, unread_ids = mail.search(None, f'(SINCE {since} UNSEEN)')

        total = len(all_ids[0].split()) if all_ids[0] else 0
        unread = len(unread_ids[0].split()) if unread_ids[0] else 0

        mail.logout()
        return json.dumps({
            "period_days": days,
            "total_tickets": total,
            "unread": unread,
            "read": total - unread,
            "avg_per_day": round(total / max(days, 1), 1),
        }, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})


# --- Entry ---

if __name__ == "__main__":
    mcp.run()
