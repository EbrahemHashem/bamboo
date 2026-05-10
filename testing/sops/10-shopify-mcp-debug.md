# SOP 10 — Shopify MCP Debug

## Wanneer gebruiken
`/conversion-analyst` of andere Systeem 4/5 skills kunnen geen Shopify data ophalen, of `/mcp` toont Shopify als niet-connected.

## Checks (in volgorde)

### 1. Token aanwezig
```bash
grep SHOPIFY_ACCESS_TOKEN ~/Bamboo/.env
grep SHOPIFY_STORE_URL ~/Bamboo/.env
```
Verwacht: `shpat_...` en `bamboodisposables.myshopify.com` (zonder https://)

### 2. Token geldig testen
```bash
curl -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" \
  "https://$SHOPIFY_STORE_URL/admin/api/2024-10/shop.json"
```
Verwacht: JSON met shop info. Krijg je 401? Token is fout of expired.

### 3. Scopes check
In Shopify admin → Apps → Develop apps → [Bamboo AI Conversion] → API credentials. Moet minimaal hebben: `read_products`, `read_orders`, `read_customers`, `read_inventory`. Zie `systems/4-conversion-engine/shopify-setup.md`.

### 4. MCP server draait
```bash
ls ~/mcp-servers/shopify/server.py
python3 ~/mcp-servers/shopify/server.py --test 2>&1 | head -20
```

### 5. Claude settings correct
```bash
cat ~/.claude/settings.local.json | grep -A5 shopify
```
Path moet `/Users/nathan/mcp-servers/shopify/server.py` zijn (of equivalent user path).

### 6. Herstart Claude Code
`/mcp` binnen Claude Code → Shopify moet `connected` zijn.

## Bekende issues

| Symptoom | Oorzaak | Fix |
|----------|---------|-----|
| `401 Unauthorized` | Token expired/ingetrokken | Nieuwe token genereren in Shopify admin |
| `404 Not Found` | Wrong store URL | Check `.myshopify.com` suffix, geen https:// prefix |
| `Insufficient permissions` | Scope mist | Extra scope toevoegen in Custom App settings |
| MCP start niet | Python deps missen | `pip3 install httpx fastmcp mcp[cli]` |
