# SOP 09 — Ad Performance Loop Debug

**Gebruik wanneer:** `bamboo-ad-performance-loop.json` workflow loopt maar pauze/scale acties gebeuren niet, of verkeerde acties worden genomen.

---

## Stap 1: Verifieer insights binnen komen

Run workflow handmatig en check node 3 (Pull Meta Ads Insights) output.

Verwacht:
```json
{
  "data": [
    {
      "ad_id": "xxx",
      "ad_name": "Bamboo Ongebleekt 3L - Waarde Hook",
      "campaign_name": "Bamboo - Hero",
      "spend": "45.50",
      "impressions": "12500",
      "clicks": "180",
      "ctr": "1.44",
      "cpc": "0.25",
      "purchase_roas": [{"action_type":"purchase","value":"2.8"}]
    }
  ]
}
```

Als `data: []` → geen actieve ads. Normaal voor test account zonder live campaigns. Gebruik mock data (zie stap 4).

Als error → zie `sops/05-meta-ads-debug.md`.

---

## Stap 2: Check Performance Rules loaded

Node 2 (Haal Performance Rules op) moet 5 rules terug geven (uit Airtable Performance Rules table).

Verwacht:
```json
[
  {"Rule Name": "Bad ROAS Pause", "Metric": "ROAS", "Operator": "<", "Threshold": 1.5, ...},
  {"Rule Name": "Winner Scale", "Metric": "ROAS", "Operator": ">", "Threshold": 3.0, ...},
  ...
]
```

Als leeg → Performance Rules table niet pre-filled. Run install schema setup of voeg handmatig toe via Airtable UI volgens `airtable-schema-ads.md`.

---

## Stap 3: Mock data test

Geen actieve productie ads? Maak mock data in test Airtable `Ad Variants` table:

```json
[
  {
    "Ad ID": "mock_ad_001",
    "Ad Name": "MOCK - Low ROAS",
    "Spend": 25.00,
    "Impressions": 5000,
    "CTR": 1.2,
    "CPC": 0.85,
    "ROAS": 1.1
  },
  {
    "Ad ID": "mock_ad_002",
    "Ad Name": "MOCK - Winner",
    "Spend": 50.00,
    "Impressions": 15000,
    "CTR": 2.5,
    "CPC": 0.60,
    "ROAS": 4.2
  },
  {
    "Ad ID": "mock_ad_003",
    "Ad Name": "MOCK - Low CTR",
    "Spend": 10.00,
    "Impressions": 2500,
    "CTR": 0.4,
    "CPC": 1.10,
    "ROAS": 1.8
  }
]
```

Voor test: swap node 3 (Meta API pull) tijdelijk uit voor een "Read Airtable Ad Variants" node die deze mock rows leest.

Verwachte acties:
- mock_ad_001 → **pause** (ROAS 1.1 < 1.5, spend > 20)
- mock_ad_002 → **scale** +20% (ROAS 4.2 > 3.0, spend < 100)
- mock_ad_003 → **flag** (CTR 0.4 < 0.5, impressions > 1000)

---

## Stap 4: Function node evaluatie logica

Open node 4 "Evalueer per Ad tegen Bamboo Regels". Function code:

```javascript
const decisions = ads.map(ad => {
  const roas = parseFloat(ad.purchase_roas?.[0]?.value || 0);
  const spend = parseFloat(ad.spend || 0);
  const ctr = parseFloat(ad.ctr || 0);
  const cpc = parseFloat(ad.cpc || 0);
  const impressions = parseInt(ad.impressions || 0);
  
  if (roas < 1.5 && spend > 20) {
    return { ad_id: ad.ad_id, action: 'pause', reason: `ROAS ${roas.toFixed(2)} < 1.5`, metrics: {...} };
  }
  if (roas > 3.0 && spend < 100) {
    return { ad_id: ad.ad_id, adset_id: ad.adset_id, action: 'scale', ... };
  }
  if (ctr < 0.5 && impressions > 1000) {
    return { ad_id: ad.ad_id, action: 'flag', ... };
  }
  if (cpc > 2.5) {
    return { ad_id: ad.ad_id, action: 'pause', ... };
  }
  return { ad_id: ad.ad_id, action: 'ok', ... };
});
```

**Debug:**
1. Add `console.log('INPUT:', JSON.stringify(ads.slice(0,1)))` om field names te checken
2. Meta API geeft `purchase_roas` als array — sommige ads hebben geen purchase → `[]` → `parseFloat(undefined) = NaN`
3. Edge case: `roas === 0` faalt in `roas < 1.5` → wordt pause. Add check `if (roas === 0 && spend === 0) continue;`

### Common fixes

**Meta field names changed:**
- `purchase_roas[0].value` → check current API response
- Fallback: `ad.purchase_roas?.[0]?.value || ad.roas || 0`

**Spend als string ipv number:**
- `parseFloat(ad.spend)` — werkt voor "45.50" en 45.50
- Als comma ipv dot (locale) → `parseFloat(ad.spend.replace(',', '.'))`

**Conversions tracking missing:**
- Ads kunnen `actions` mis hebben als Pixel niet properly configured
- Fallback: use `link_clicks` als proxy

---

## Stap 5: Switch node route werkt niet

Node 5 (Route beslissing) routeert op `action` veld. Check:

```
Data Property Name: action
Values:
  "pause" → output 0
  "scale" → output 1
  "flag"  → output 2
  "ok"    → output 3
```

**Veelgemaakte fout:** in n8n v1+, switch node heeft andere syntax — "Rules" ipv "Values". Check versie en update config.

---

## Stap 6: Meta API write calls

### Pause (node 6)
```
POST https://graph.facebook.com/v19.0/{ad_id}
body: {
  status: "PAUSED",
  access_token: $env.META_ACCESS_TOKEN
}
```

Test handmatig:
```bash
curl -X POST "https://graph.facebook.com/v19.0/ADTEST_ID" \
  -d "status=PAUSED" \
  -d "access_token=$META_ACCESS_TOKEN"
```
Verwacht: `{"success":true}`.

Errors:
- `100 Invalid parameter` → ad_id fout
- `200 Permissions error` → token heeft geen `ads_management` scope
- `17 Rate limit` → wacht

### Scale (node 7)
```
POST https://graph.facebook.com/v19.0/{adset_id}
body: {
  daily_budget: {new_amount_cents},
  access_token: $env.META_ACCESS_TOKEN
}
```

**KRITIEKE BUG FIX**: `daily_budget` moet in **cents** (integer), niet euros!

Huidig in node config:
```javascript
daily_budget: Math.round($json.metrics.spend * 1.2 * 100)
```

Probleem: `spend` is huidige spend, niet huidige daily_budget. Fix:

```javascript
// Haal eerst current adset op
const adset = await fetch(`https://graph.facebook.com/v19.0/${adset_id}?fields=daily_budget&access_token=${token}`);
const currentBudget = parseInt(adset.daily_budget); // already in cents
const newBudget = Math.round(currentBudget * 1.2);
// max cap check
const maxCap = parseInt($env.BAMBOO_DAILY_BUDGET_CAP) * 100;
const finalBudget = Math.min(newBudget, maxCap);
```

Zonder die fix → scales te agressief of te voorzichtig.

---

## Stap 7: Decisions Log schrijven

Node 9 (Log in Decisions Log) moet alle beslissingen naar Airtable schrijven, ook `ok` beslissingen (voor audit trail).

Check Airtable Decisions Log tabel bestaat met velden:
- Timestamp (dateTime)
- Ad ID (singleLineText)
- Action (singleSelect: Pause/Scale/Flag/OK)
- Reason (longText)
- ROAS, Spend, CTR, CPC (numbers)

Als writes falen → zie `sops/03-airtable-debug.md`.

---

## Stap 8: Telegram notificatie

Node 10 stuurt Telegram ping met summary. Verwacht:
```
📊 Bamboo Ads Update
Acties afgelopen 4u:
⏸ Gepauzeerd: 2
📈 Opgeschaald: 1
🚩 Geflagged: 0
```

Als niet aankomt:
- Check `TELEGRAM_BOT_TOKEN` en `TELEGRAM_CHAT_ID`
- Bot moet gestart zijn (Nathan moet `/start` gestuurd hebben)
- Chat ID = Nathan's eigen user ID (via @userinfobot)

---

## Stap 9: Safety rules verificatie

Expliciete veiligheidsregels in workflow moeten werken:

1. **Scale max +20% per run** — check cap in function logica
2. **Daily budget cap** — check `BAMBOO_DAILY_BUDGET_CAP` env var wordt gerespecteerd
3. **Pause threshold ROAS 1.5** — hardcoded, niet lager tunable
4. **API error handling** — bij Meta error, don't retry, alert Nathan via Telegram

Test safety:
- Set mock ROAS 5.0 → moet scale +20%, NIET +100%
- Set mock daily_budget al op cap → moet stoppen, niet verder scalen
- Simuleer Meta API 500 error → moet Telegram alert sturen

---

## Stap 10: Cron activering

Workflow moet **active** staan voor cron (elke 4 uur) te werken. Check toggle rechtsboven.

Test-run eerst handmatig voor je activeert. Nooit live activeren zonder volledige test flow te hebben gepasseerd.

---

## Veelvoorkomende issues

| Symptoom | Oorzaak | Fix |
|----------|---------|-----|
| Rules leeg | Performance Rules table niet filled | Pre-fill via Airtable UI |
| NaN in ROAS calc | purchase_roas undefined | Optional chaining + fallback to 0 |
| Wrong action taken | Meta field name changed | Check API response structure |
| Budget scale 100x | euros ipv cents | `daily_budget * 100` in cents |
| Pauzes werken niet | Wrong ad_id format | Check Meta returns numeric IDs |
| Telegram silent | Bot niet gestart | Nathan moet eerst `/start` sturen |
| Decisions Log leeg | Airtable write fails | Zie SOP 03 |
| Cron doesn't fire | Workflow inactive | Toggle Active aan |
| Scale exceeds cap | Cap check mist | Add `Math.min(newBudget, maxCap)` |
| False pause on new ads | Spend > 20 fires too fast | Add `days_active > 1` check |
