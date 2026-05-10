# Systeem 5 — Revenue Engine

## Wat dit systeem doet

De Revenue Engine is de omzet-motor van Bamboo Disposables. Twee sporen draaien parallel:

1. **B2C retentie** — Shopify klanten segmenteren, reorder reminders triggeren, Klaviyo flows monitoren, LTV verhogen
2. **B2B leadgen** — kantoren, scholen, wellness, hospitality vinden, outreach draaien, pipeline beheren

Doel: €5-6k/maand → €50-60k/maand. Meer repeat-orders op het hero product (Ongebleekt 3 laags 48 rollen) + stabiele B2B bulk-verbruikers op 96 rollen.

Dagelijks draaien drie n8n workflows die signalen oppakken en acties triggeren. Skills lopen ad-hoc of vanuit de workflows.

---

## Hoe Nathan het gebruikt

### Automatisch (standaard)
- **08:00** — retention flow monitor check Klaviyo performance → Telegram alert bij degraderende flows
- **09:00 + 15:00** — B2B pipeline check → reactie classificeren + pipeline stage updaten
- **10:00** — reorder trigger → klanten met depletion <14 dagen krijgen reminder

### Handmatig — segmentatie & analyse
```
/customer-segmenter
/revenue-analyst
```

### Handmatig — B2B prospecting & outreach
```
/b2b-prospector "kantoren Amsterdam 20-50 medewerkers"
/b2b-outreach "pitch voor Yoga studio Amsterdam"
/reply-classifier "[reply text]"
/respond-to-leads
```

### Handmatig — reorder & email flows
```
/reorder-engine
/email-flow-builder "reorder flow voor 48 rollen klanten"
```

### Handmatig — customer service
```
/cs-agent
```

### Vragen aan het systeem
```
Welke klanten zitten in segment VIP en kopen nu 48 rollen — stuur ze upsell naar 96?
Wat is onze repeat rate laatste 90 dagen?
Welke B2B leads staan op Engaged en hebben geen follow-up in 5 dagen?
Welke Klaviyo flows presteren onder 20% open rate?
```

---

## Technische setup

### Airtable base (uitbreiding op "Bamboo Revenue")
Zie `airtable-schema-revenue.md`. Vier nieuwe tabellen:
- **Table 11: Customer Segments** — klant-niveau segmentatie (Shopify sync)
- **Table 12: Email Performance** — Klaviyo flow health tracking
- **Table 13: B2B Leads** — B2B pipeline
- **Table 14: Reorder Signals** — reorder timing + trigger log

### MCP servers nodig
- **Airtable** — data opslag & pipeline
- **Shopify** — klant- en order-data
- **Apify** — B2B company scraping (Google Maps, LinkedIn)
- **Gmail / IMAP** — B2B reply detection
- **Klaviyo** — email flows (via HTTP of Klaviyo MCP indien beschikbaar)
- **Telegram** — alerts naar Nathan

### Skills (in `skills/` folder, geïnstalleerd in `~/.claude/commands/`)
- `/customer-segmenter` — Shopify klanten segmenteren → Airtable
- `/email-flow-builder` — Klaviyo flows bouwen met Bamboo voice
- `/reorder-engine` — reorder timing per klant + reminder trigger
- `/b2b-prospector` — target companies vinden + verrijken
- `/b2b-outreach` — gepersonaliseerde B2B email genereren
- `/reply-classifier` — inbound reply classificeren
- `/respond-to-leads` — volledige B2B lead response pipeline
- `/cs-agent` — customer service triage Shopify/DM
- `/revenue-analyst` — LTV, repeat rate, cohort analyse

### n8n workflows
- `bamboo-retention-flow-monitor.json` — dagelijks 08:00, Klaviyo health check
- `bamboo-b2b-pipeline.json` — 2x/dag (9 + 15), B2B reply detect + pipeline update
- `bamboo-reorder-trigger.json` — dagelijks 10:00, reorder reminder flow

### Klaviyo setup
Zie `klaviyo-setup.md` voor API key stappen + Shopify integratie.

### B2B segmenten & outreach hoeken
Zie `b2b-target-groups.md` voor 4 segmenten met pitch angles en cold openers.

### Email templates
Zie `email-templates.md` voor 6 Bamboo-specifieke emails (welcome, aftersales, reorder, winback, upsell).

---

## Environment variables

```bash
AIRTABLE_API_KEY=pat_xxx
AIRTABLE_BASE_ID=appXXX
SHOPIFY_STORE_URL=bamboodisposables.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxx
KLAVIYO_API_KEY=pk_xxx
KLAVIYO_REORDER_24_FLOW_ID=xxx
KLAVIYO_REORDER_48_FLOW_ID=xxx
KLAVIYO_REORDER_96_FLOW_ID=xxx
KLAVIYO_WINBACK_FLOW_ID=xxx
APIFY_API_TOKEN=apify_api_xxx
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
GMAIL_REFRESH_TOKEN=xxx
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx
NATHAN_EMAIL=nathan@bamboodisposables.nl
```

---

## Verificatie na installatie

1. **Airtable check** — 4 nieuwe tabellen (11-14) aangemaakt met correcte velden
2. **Shopify MCP** — `/customer-segmenter` draait zonder error en vult Customer Segments
3. **Klaviyo key** — test API call: `curl https://a.klaviyo.com/api/flows/ -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY"` → 200
4. **Reorder logic** — `/reorder-engine` draait, vult Reorder Signals tabel voor klanten met depletion <14 dagen
5. **B2B prospector** — `/b2b-prospector "kantoren Amsterdam 20-50 medewerkers"` → 10+ rows in B2B Leads
6. **Outreach email** — `/b2b-outreach "Yoga studio Amsterdam"` → email draft zonder activist-taal, 2 van de 3 kernregels
7. **n8n imports** — alle 3 workflows importeren zonder error, paused by default
8. **Retention monitor** — handmatige trigger → Telegram samenvatting met flow health
9. **B2B pipeline** — handmatige trigger → test reply wordt geclassificeerd, stage geupdated
10. **Reorder trigger** — handmatige trigger → Klaviyo flow trigger call 200, Airtable update
11. **Brand voice check** — alle email templates en outreach bevatten minimaal 2 van 3 kernregels (gebruikswaarde / minder verspilling / geen bomen) én geen activist-taal

---

## KPI's die Nathan tracked

| KPI | Doel | Bron |
|-----|------|------|
| Repeat rate (90d) | >35% | Customer Segments |
| Average LTV | >€85 | Customer Segments |
| Reorder reminder → aankoop | >25% | Reorder Signals + Shopify |
| Email revenue attribution | >20% van totaal | Klaviyo + Email Performance |
| B2B leads → meeting | >8% | B2B Leads |
| B2B closed-won → MRR | €2k → €15k/mnd | B2B Leads |
| Winback flow recovery | >10% | Klaviyo + Customer Segments |
