# Meta Ads Setup — Bamboo

Nathan moet eenmalig een Meta Developer App aanmaken en een long-lived token genereren voordat Systeem 3 kan draaien. Install script loodst hem hierdoorheen, maar dit is de referentie.

## Stap 1: Meta Developer Account
1. Ga naar https://developers.facebook.com
2. Log in met Nathan's Facebook account (zelfde account dat Meta Ads Manager gebruikt)
3. My Apps → Create App → Business → "Bamboo AI System"

## Stap 2: Business Manager koppelen
1. Meta Business Suite → Settings → Users → System Users
2. Maak system user: "bamboo-ai-system"
3. Assign assets: Ad Account (Bamboo Disposables), Facebook Page, Instagram Account
4. Grant permissions: `ads_management`, `ads_read`, `business_management`

## Stap 3: Long-lived token genereren
1. In Graph API Explorer (https://developers.facebook.com/tools/explorer/):
2. Select app: Bamboo AI System
3. Select user: system user
4. Permissions: `ads_management`, `ads_read`, `business_management`
5. Generate Access Token
6. Extend to long-lived token via:
   ```
   https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN
   ```

## Stap 4: Vul env vars
```bash
META_AD_ACCOUNT_ID=act_XXXXXXXXXX  # zonder 'act_' prefix kan ook
META_ACCESS_TOKEN=EAA...            # long-lived token
META_APP_ID=XXXXX
META_APP_SECRET=XXXXX               # alleen nodig voor token refresh
```

## Stap 5: Test
```bash
curl -G "https://graph.facebook.com/v19.0/act_${META_AD_ACCOUNT_ID}/campaigns" \
  -d "fields=name,status" \
  -d "access_token=${META_ACCESS_TOKEN}"
```
Moet JSON met campagnes teruggeven (lege array is ook OK als nog geen campagnes).

## Belangrijk
- Long-lived token is ~60 dagen geldig. Systeem 3 refresht automatisch als laatste refresh >50 dagen geleden is.
- Als token verloopt en refresh faalt → Nathan moet handmatig nieuwe genereren en env var updaten.
- Bij twijfel over tokens → nooit committen in git, alleen in `.env` file.

## Links
- Meta Ads MCP server: `~/.lio_os/systems/ad-systems/reference/meta-ads-mcp/server.py` (15 tools)
- Meta Graph API docs: https://developers.facebook.com/docs/marketing-apis/
