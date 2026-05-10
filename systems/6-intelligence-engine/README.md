# Systeem 6 — Intelligence Engine

## Wat dit systeem doet

Dit is het **centrale brein** van Bamboo. Engines 1 t/m 5 leveren elk hun data in dezelfde Airtable base ("Bamboo Ad Research"). Deze engine doet één ding: **alles bij elkaar trekken en er betekenis uit halen**.

Geen losse dashboards, geen losse spreadsheets, geen losse rapportjes. Eén brein dat elke dag om 07:30 Nathan's inbox (Telegram) hit met een kort briefje, elke maandag met een volledig strategisch rapport, en elke 4 uur waakt op rare afwijkingen.

En een dashboard waar Nathan of zijn broer live de KPIs kunnen bekijken — zonder iets te hoeven klikken in Airtable zelf.

---

## Wat je eruit krijgt

1. **Daily Intelligence Brief** — elke ochtend 07:30 via Telegram. 5 regels. Gisteren's omzet, ROAS, nieuwe klanten, 1 hot insight, 1 actiepunt.
2. **Weekly Strategy Report** — elke maandag 10:00 via email. Top Wins / Top Concerns / 3 aanbevelingen / actielijst. Gegenereerd met Claude.
3. **Anomaly Detector** — draait elke 4 uur. Alleen Telegram-ping als er écht iets afwijkt (CPA spike, CR drop, lage voorraad, email flow stuk).
4. **Dashboard** — `dashboard.html` lokaal openen, krijgt live data uit Airtable.
5. **On-demand skills** — `/intelligence-brief`, `/pattern-detector`, `/forecast-engine`, `/cross-engine-optimizer`, `/finance-analyst`.

---

## Data flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         BAMBOO AD RESEARCH                        │
│                          (Airtable base)                          │
│                                                                   │
│   Engine 1 ──►  Competitors / Ad Research / Weekly Digest        │
│   Engine 2 ──►  Content Calendar / Hook Bank                     │
│   Engine 3 ──►  Campaigns / Ad Variants / Performance Rules      │
│                 Decisions Log                                     │
│   Engine 4 ──►  Conversion Tracking / Funnel Events              │
│   Engine 5 ──►  Customer Segments / Email Performance /          │
│                 B2B Leads / Pipeline                              │
└──────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                     ┌─────────────────────────┐
                     │   ENGINE 6 — BRAIN      │
                     │                         │
                     │  Aggregeert + analyseert│
                     │  Detecteert patronen    │
                     │  Genereert recommends   │
                     └──────────┬──────────────┘
                                │
       ┌────────────────────────┼─────────────────────┬──────────────┐
       ▼                        ▼                     ▼              ▼
┌───────────────┐     ┌──────────────────┐    ┌─────────────┐  ┌──────────┐
│  Daily Brief  │     │  Weekly Report   │    │  Anomaly    │  │Dashboard │
│  (Telegram)   │     │  (Email + AT)    │    │  Alerts     │  │  (HTML)  │
│  07:30        │     │  Ma 10:00        │    │  elke 4u    │  │  live    │
└───────────────┘     └──────────────────┘    └─────────────┘  └──────────┘
```

---

## Hoe Nathan het gebruikt

### Automatisch (standaard)
Niks doen. Systeem werkt vanzelf. Zet n8n workflows aan, klaar.

### Handmatig — on demand
```
/intelligence-brief
/pattern-detector "laatste 30 dagen"
/forecast-engine "30 dagen"
/cross-engine-optimizer
/finance-analyst P&L this month
```

### Dashboard bekijken
Open `dashboard.html` in browser. Eerste keer vraagt 'ie Airtable API key + Base ID (localStorage). Daarna ziet Nathan live:
- Omzet vandaag, ROAS vandaag, orders vandaag, actieve campagnes
- Shopify CR, Repeat Rate, B2B Pipeline Value
- Conversion funnel (sessions → cart → checkout → orders)
- Anomalies laatste 7 dagen (rood/geel)
- Top campagnes laatste 7 dagen

---

## Technische setup

### Airtable base
Zelfde base als Engines 1-5: **Bamboo Ad Research**

Nieuwe tables toegevoegd door Engine 6:
- **Table 15: Daily KPIs** — 1 row per dag, geaggregeerd uit alle andere tables
- **Table 16: Strategy Reports** — 1 row per week, AI-gegenereerd
- **Table 17: Anomaly Log** — elke detectie een row

Zie `airtable-schema-intelligence.md` voor volledige velddefinities.

### MCP servers nodig
- **Airtable** (lezen + schrijven, zelfde token als andere engines)
- **Anthropic API** (voor weekly report generatie) — via HTTP node in n8n

### n8n workflows
Importeer in n8n:
- `bamboo-daily-intelligence.json` — cron 07:30 dagelijks
- `bamboo-weekly-strategy-report.json` — cron maandag 10:00
- `bamboo-anomaly-detector.json` — cron elke 4 uur

### Skills
Installeren via install script (kopieert naar `~/.claude/commands/`):
- `/intelligence-brief`
- `/pattern-detector`
- `/forecast-engine`
- `/cross-engine-optimizer`
- `/finance-analyst`

---

## Environment variables

```bash
AIRTABLE_API_KEY=pat_xxx
AIRTABLE_BASE_ID=appXXX

# Tables (zelfde base)
AIRTABLE_DAILY_KPIS_TABLE=Daily KPIs
AIRTABLE_STRATEGY_REPORTS_TABLE=Strategy Reports
AIRTABLE_ANOMALY_LOG_TABLE=Anomaly Log

# Alerts
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx
NATHAN_EMAIL=nathan@bamboodisposables.nl
SENDER_EMAIL=bot@bamboodisposables.nl

# Claude API (voor weekly report)
ANTHROPIC_API_KEY=sk-ant-xxx
```

---

## Verificatie na installatie

1. Airtable heeft de 3 nieuwe tabellen (Daily KPIs, Strategy Reports, Anomaly Log)
2. `/intelligence-brief` draait zonder error en geeft Nederlandse samenvatting
3. n8n `bamboo-daily-intelligence` — manual trigger → Telegram binnen
4. n8n `bamboo-anomaly-detector` — manual trigger → geen false positives bij normale data
5. `dashboard.html` openen in browser → vraagt creds → toont data
6. `/forecast-engine 30 dagen` → komt met concrete EUR-projectie

---

## Thresholds & KPIs

Alle KPI definities, formules en thresholds (good / warning / critical) staan in `kpi-definitions.md`.

Belangrijkste:
- **ROAS** <1.5 kritiek, 1.5-2.0 waarschuwing, 2.0-3.0 goed, >3.0 top
- **Shopify CR** <1.5% kritiek, 1.5-2.5% gemiddeld, 2.5-4% goed, >4% top
- **Repeat Rate** <15% zwak, 15-25% gezond, >25% sterk
- **Inventory runway** <14 dagen kritiek, <30 dagen watchen
- **Email Revenue Share** doel: 25-35% van totale omzet

---

## Files in deze folder

| Bestand | Inhoud |
|---------|--------|
| `README.md` | Dit bestand |
| `airtable-schema-intelligence.md` | Velddefinities Table 15/16/17 |
| `kpi-definitions.md` | Alle KPIs, formules, thresholds |
| `dashboard.html` | Single-file live dashboard |
| `bamboo-daily-intelligence.json` | n8n workflow — dagelijkse brief |
| `bamboo-weekly-strategy-report.json` | n8n workflow — maandag strategie |
| `bamboo-anomaly-detector.json` | n8n workflow — elke 4u anomalies |
| `skills/intelligence-brief.md` | Skill — on-demand daily brief |
| `skills/pattern-detector.md` | Skill — patronen in laatste N dagen |
| `skills/forecast-engine.md` | Skill — 30/60/90 dagen forecast |
| `skills/cross-engine-optimizer.md` | Skill — aanbevelingen dwars door engines |
| `skills/finance-analyst.md` | Skill — P&L + unit economics per productlijn |
