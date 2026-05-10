# SOP 14 — Intelligence Engine Debug

## Wanneer gebruiken
Systeem 6 (Intelligence) — daily brief, weekly report, anomaly detector, dashboard — werkt niet.

## Debug per component

### /intelligence-brief output is leeg of incompleet
1. Airtable bevat data in alle feeder tabellen? (Ad Variants, Conversion Tracking, Customer Segments, B2B Leads, Email Performance)
2. Min 1 dag aan data nodig voor zinvolle brief
3. Airtable API key kan ALLE tabellen lezen? Base-scope PAT

### Daily intelligence (n8n) draait maar geen Telegram alert
- Schedule: `30 7 * * *` (07:30 dagelijks)
- Telegram bot token en chat ID correct in n8n credentials?
- Function node genereert juiste output format?
- Test: handmatig execute → check Airtable Daily KPIs tabel eerst gevuld → dan Telegram

### Weekly strategy report mailt niet
- SMTP credentials in n8n correct? (SMTP_HOST, SMTP_USER, SMTP_PASS)
- Gmail? Dan App Password nodig (geen hoofdwachtwoord)
- NATHAN_EMAIL in .env gevuld?
- Claude API key (HTTP node) geldig? Test met curl

### Anomaly detector fires te veel (noise)
- Thresholds tunen in `.env`:
  - `BAMBOO_CPA_SPIKE_MULTIPLIER=1.5` → verhogen naar 2.0 voor minder alerts
  - `BAMBOO_CR_DROP_MULTIPLIER=0.7` → verlagen naar 0.5
- Baseline te kort? Min 14 dagen aan data voor zinvolle baseline
- Severity filter: alleen `Critical` naar Telegram, Warning naar Airtable log

### Anomaly detector fires niet
- Inject testdata: CPA 3x baseline in Daily KPIs → moet binnen 4u triggeren
- Cron schedule: `0 */4 * * *` (elke 4 uur)
- Anomaly Log tabel bestaat?

### Dashboard.html laadt geen data
- Open in browser → Developer Console → network errors?
- Airtable credentials correct ingevoerd (hash of localStorage)?
- CORS? Airtable REST API staat cross-origin toe vanuit localhost en file:// met PAT
- PAT heeft `data.records:read` scope voor deze base?

## Smoke test

```
/intelligence-brief
/pattern-detector "laatste 14 dagen"
/forecast-engine "30 dagen"
/cross-engine-optimizer
```

Alle output Dutch, met concrete getallen, en minimaal 1 cross-engine inzicht (bv. "Product X wint in ads maar verliest op Shopify CR").
