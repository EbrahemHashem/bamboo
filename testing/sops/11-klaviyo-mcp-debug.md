# SOP 11 — Klaviyo MCP Debug

## Wanneer gebruiken
Revenue Engine skills (`/email-flow-builder`, `/customer-segmenter`, retention monitor) krijgen geen Klaviyo data.

## Checks

### 1. API key
```bash
grep KLAVIYO_API_KEY ~/Bamboo/.env
```
Verwacht: `pk_...`

### 2. Scopes + geldigheid testen
```bash
curl -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-10-15" \
  "https://a.klaviyo.com/api/accounts/"
```
Verwacht: JSON met account data.

### 3. Shopify integratie actief
Klaviyo admin → Integrations → Shopify. Moet "Connected" zijn. Zonder dit geen customer sync.

### 4. Required scopes
Private API Key moet hebben: Campaigns (R/W), Flows (R/W), Lists (R/W), Profiles (R/W), Metrics (R), Segments (R/W). Check in Klaviyo Account → Settings → API Keys.

### 5. MCP server
```bash
ls ~/mcp-servers/klaviyo/server.py
python3 ~/mcp-servers/klaviyo/server.py --test 2>&1 | head -20
```

## Bekende issues

| Symptoom | Fix |
|----------|-----|
| `401` | Nieuwe Private API Key met juiste scopes |
| `429 Rate limit` | Klaviyo tier limiet — wacht 1 min of upgrade plan |
| Geen flows zichtbaar | Shopify integratie niet actief of flows nog niet live |
| Geen customers | Shopify → Klaviyo sync draait nog — wacht 15 min |
