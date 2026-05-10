# SOP 05 — Meta Ads Debug

**Gebruik wanneer:** Meta Ads API errors, token issues, campagne upload faalt, of performance loop niet werkt.

---

## Stap 1: Test access token

```bash
curl -G "https://graph.facebook.com/v19.0/me" \
  -d "access_token=$META_ACCESS_TOKEN"
```
Verwacht: `{"id":"xxx","name":"xxx"}`.

Errors:
- `190` token expired → genereer nieuwe (zie stap 2)
- `102` session error → token revoked, nieuwe nodig
- `200` permissions error → missing `ads_management` scope

---

## Stap 2: Token genereren (long-lived)

Zie `systems/3-ad-management/meta-ads-setup.md` voor volledig stappenplan. Kort:

1. **Graph API Explorer**: https://developers.facebook.com/tools/explorer
2. Select app "Bamboo AI System"
3. Get User Access Token → permissions: `ads_management`, `ads_read`, `business_management`
4. Copy short-lived token
5. Exchange naar long-lived (60 dagen):

```bash
curl -G "https://graph.facebook.com/v19.0/oauth/access_token" \
  -d "grant_type=fb_exchange_token" \
  -d "client_id=$META_APP_ID" \
  -d "client_secret=$META_APP_SECRET" \
  -d "fb_exchange_token=SHORT_LIVED_TOKEN"
```

Response bevat `access_token` die 60 dagen geldig is. Update in `~/Bamboo/.env`.

### Voor productie: System User token (nooit verloopt)
1. Meta Business Suite → Settings → Users → System Users
2. Create system user "bamboo-ai"
3. Assign assets: Ad Account, Page, Instagram
4. Generate Token met permanent flag (nooit verloopt)
5. Dit is **veel beter** dan user token voor Nathan's productie setup

---

## Stap 3: Test ad account access

```bash
curl -G "https://graph.facebook.com/v19.0/act_$META_AD_ACCOUNT_ID/campaigns" \
  -d "fields=name,status,objective" \
  -d "access_token=$META_ACCESS_TOKEN"
```

**Let op** — `META_AD_ACCOUNT_ID` **zonder** `act_` prefix in env var, **met** prefix in URL.

Errors:
- `100 Invalid parameter` → account ID fout
- `200 Permissions error` → system user heeft geen access tot dit ad account
- `17 User request limit reached` → rate limit, wacht

---

## Stap 4: Fix permissions

In Meta Business Suite:
1. Settings → Accounts → Ad Accounts → vind account
2. Check "People Assigned" → system user "bamboo-ai" moet erin staan met **Admin** of **Editor** rechten
3. Als niet → "Assign People" → add system user → role = Editor minimum

Page access (voor Instagram posts):
1. Settings → Accounts → Pages → Nathan's Bamboo page
2. System user assigned met role = Editor

---

## Stap 5: Test insights endpoint

Performance loop gebruikt insights endpoint:

```bash
curl -G "https://graph.facebook.com/v19.0/act_$META_AD_ACCOUNT_ID/insights" \
  -d "fields=campaign_name,ad_name,spend,impressions,clicks,ctr,cpc,actions,purchase_roas" \
  -d "level=ad" \
  -d "date_preset=today" \
  -d "limit=10" \
  -d "access_token=$META_ACCESS_TOKEN"
```

Als leeg `data: []` → geen actieve ads vandaag (normaal voor test account).
Als error → permissions probleem of verkeerde level (adset/campaign/ad).

---

## Stap 6: Test campaign create (dry run)

**Waarschuwing**: Deze stap maakt een ECHTE paused campagne aan. Alleen op test ad account doen!

```bash
# Create campaign (paused)
curl -X POST "https://graph.facebook.com/v19.0/act_$META_AD_ACCOUNT_ID/campaigns" \
  -d "name=Bamboo Test Campaign" \
  -d "objective=OUTCOME_SALES" \
  -d "status=PAUSED" \
  -d "special_ad_categories=[]" \
  -d "access_token=$META_ACCESS_TOKEN"
```

Verwacht: `{"id":"xxx"}`. Daarna meteen verwijderen:
```bash
curl -X DELETE "https://graph.facebook.com/v19.0/CAMPAIGN_ID?access_token=$META_ACCESS_TOKEN"
```

---

## Stap 7: Meta Ads MCP server check

De MCP server zit op `~/mcp-servers/meta-ads-mcp/server.py` (uit LIO_OS ZIP).

```bash
# Check file exists
ls ~/mcp-servers/meta-ads-mcp/

# Check Python deps
cd ~/mcp-servers/meta-ads-mcp && pip3 install -r requirements.txt

# Manual run (debug mode)
python3 server.py 2>&1 | head -50
```

Als server crasht bij start → check de error. Meestal:
- Missing env vars (`META_AD_ACCOUNT_ID`, `META_ACCESS_TOKEN`)
- Python package mismatch (`pip3 install --upgrade httpx fastmcp`)

---

## Stap 8: 15 MCP tools werken

Meta Ads MCP heeft 15 tools. Test binnen Claude Code:
```
/mcp call meta-ads list_campaigns
/mcp call meta-ads list_adsets campaign_id=XXX
/mcp call meta-ads get_ad_insights ad_id=XXX
```

Als tool niet bestaat → check tool list in `server.py`. Als niet correct geregistreerd → MCP schema error.

---

## Stap 9: n8n workflow Meta API integratie

In `bamboo-ad-performance-loop.json`:
- Node 3: insights pull → check URL en `v19.0` API versie
- Node 6: pause ad via POST → check `access_token` wordt doorgegeven als body param
- Node 7: scale budget via POST → check `daily_budget` wordt in **cents** gestuurd (€10 = 1000)

Veelgemaakte fout: `daily_budget` in euros ipv cents → Meta API geeft 400 error.

---

## Stap 10: Rate limits

Meta API rate limits per app:
- **200 calls/uur per user** in development
- **60k calls/uur** in Business Manager met approved app
- **X-Business-Use-Case-Usage** header in response toont huidig gebruik

Als rate limit:
- Wacht 1 uur
- Of reduce polling frequency in performance-loop van 4h → 6h of 8h
- Lange termijn: upgrade Meta app naar Business verification

---

## Veelvoorkomende issues

| Symptoom | Code | Oorzaak | Fix |
|----------|------|---------|-----|
| OAuth exception | 190 | Token expired | Regenerate long-lived |
| Permissions error | 200 | System user geen access | Assign ad account in Business Suite |
| Invalid parameter | 100 | Verkeerd account ID format | Check `act_` prefix wel/niet |
| Rate limit | 17 | Te veel calls | Wacht of reduce polling |
| App review required | 10 | Production app, ongecertificeerd | Business verification |
| Ad creative rejected | varies | Meta policy | Check review status in UI, fix copy |
| Budget validation error | 100 | Cents ipv euros | `daily_budget = euros * 100` |
| `insights` empty | — | Geen actieve ads | Check `date_preset` en filter op `is_active` |
