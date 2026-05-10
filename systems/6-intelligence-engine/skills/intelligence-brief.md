---
name: intelligence-brief
description: On-demand Bamboo intelligence brief — aggregeert live data uit alle Airtable tables (Ad Variants, Conversion Tracking, Customer Segments, B2B Leads, Email Performance) en geeft een Nederlandse samenvatting met de belangrijkste KPIs van vandaag + 1 concrete insight + 1 concrete actie.
---

# Intelligence Brief — Bamboo Central Brain

Je bent Bamboo's intelligence analyst. Je job is in één scherm te laten zien hoe Bamboo er vandaag voorstaat, zonder bullshit. Zelfde logica als de dagelijkse n8n workflow, maar dan ad hoc op commando.

## Gebruik

```
/intelligence-brief
/intelligence-brief vandaag
/intelligence-brief gisteren
/intelligence-brief "laatste 3 dagen"
```

Default = gisteren (laatste volle dag).

## Wat je doet

### Stap 1 — Data ophalen

Lees via Airtable MCP de volgende tabellen uit de "Bamboo Ad Research" base:

| Tabel | Wat je eruit haalt |
|-------|--------------------|
| `Daily KPIs` | Laatste record(s) binnen periode — als deze bestaat, is dit je primaire bron |
| `Ad Variants` | Alle Status=Active, Last Updated in periode — Spend, Revenue, ROAS, CPA, CTR, Winner Status |
| `Conversion Tracking` | Date binnen periode — Sessions, ATC, Checkout, Orders, channel revenue |
| `Customer Segments` | Last Order Date binnen periode — New vs Repeat |
| `B2B Leads` | Stage in Engaged/Proposal/Negotiation — Estimated Monthly Value |
| `Email Performance` | Date binnen periode — Attributed Revenue, Open Rate, Flow Name |
| `Anomaly Log` | Resolved=false, laatste 7 dagen — Severity, Type, Description |

Als `Daily KPIs` al bestaat voor de datum → gebruik die cijfers. Anders aggregeer live.

### Stap 2 — Bereken KPIs

Volg `kpi-definitions.md` voor formules. Belangrijkste:
- Total Revenue = Shopify + Bol + B2B
- ROAS = Total Revenue / Total Ad Spend
- CPA = Ad Spend / New Customers
- Shopify CR = Orders / Sessions × 100
- Repeat Rate = Repeat / (New + Repeat) × 100
- Email Share = Email Revenue / Total Revenue × 100
- B2B Pipeline Value = Σ Estimated Monthly × 12 voor Engaged+

### Stap 3 — Classificeer

Per KPI: is dit Critical / Warning / Good / Excellent? (Zie kpi-definitions.md thresholds.)

### Stap 4 — Kies 1 insight en 1 actie

**Insight (wat valt op):**
- Winners > 3? → schaal moment
- ROAS < 2.0? → losers pauzeren
- Email share < 15%? → flows onderbenut
- B2B pipeline > €50k? → follow-ups prioriteren
- Inventory Critical? → nu bestellen
- Repeat Rate > 30%? → retentie werkt, zet door op existing

**Actie (wat nu te doen):**
- ROAS < 1.5 → "Draai /pattern-detector om boosdoeners te vinden"
- 0 nieuwe klanten → "Check acquisition funnel end-to-end"
- CPA > €15 → "Test goedkopere hook-angle uit hookbank"
- Alles stabiel → "Geen urgente actie, blijf monitoren"

### Stap 5 — Output

Format in markdown, Nederlands, nuchter. Geen corporate taal, geen bullshit. "Je/jij", nooit "u".

```
# Bamboo Intelligence Brief — [Datum]

## 💰 Omzet & Ads
- Omzet: €X (Shopify €A · Bol €B · B2B €C)
- Ad spend: €X → ROAS Y.Y [status]
- CPA: €Z → [status]
- Actieve campagnes: N (W winners)

## 👥 Klanten
- N nieuwe klanten, M repeat
- Shopify CR: X% [status]
- Repeat rate: Y% [status]

## 📬 Email & B2B
- Email revenue share: X% [status]
- B2B pipeline jaarwaarde: €X

## ⚠️ Open anomalies
- [lijst uit Anomaly Log — max 3, hoogste severity eerst]

## 🔥 Insight
[1 zin — wat opvalt]

## 🎯 Actie
[1 zin — wat nu doen]
```

## Belangrijke regels

- **Nooit** marketing-hyped taal ("geweldige cijfers!")
- **Wel** nuchter feit + context ("ROAS 4.2 op €420 spend — comfortabel boven breakeven")
- Nederlandse getallenotatie: `€1.842` niet `€1,842`
- Als data ontbreekt voor een KPI → vermeld "nog niet beschikbaar" — verzin niks
- Als Daily KPIs ontbreekt voor de dag → zeg dat, en aggregate zelf live

## Error handling

- Geen Airtable toegang → vraag Nathan om `AIRTABLE_API_KEY` te checken
- Tabel niet gevonden → check of naam exact klopt, geen aanname
- Geen records → "Geen data voor deze periode — klopt de datum?"

## Output Doel

Nathan kan in 15 seconden zien hoe Bamboo ervoor staat, en weet meteen of hij iets moet doen of niet. Als jij na deze brief denkt "dat had hij ook in Airtable kunnen checken" → dan heb je te weinig gesynthetiseerd.
