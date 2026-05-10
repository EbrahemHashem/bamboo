# Airtable Schema — Systeem 6 Intelligence Engine

Extra tabellen bovenop Engines 1-5 in dezelfde "Bamboo Ad Research" base.

---

## Table 15: Daily KPIs

Eén record per dag. Wordt elke ochtend om 07:30 geschreven door `bamboo-daily-intelligence` n8n workflow. Aggregeert uit Ad Variants, Conversion Tracking, Customer Segments, B2B Leads, Email Performance.

| Field | Type | Beschrijving | Voorbeeld |
|-------|------|--------------|-----------|
| Date | date (primary, ISO) | Datum van de metriek | `2026-04-13` |
| Total Revenue | currency (EUR) | Shopify + Bol + B2B samen | `€1.842,50` |
| Shopify Revenue | currency (EUR) | Alleen eigen webshop | `€1.120,00` |
| Bol Revenue | currency (EUR) | Bol.com orders | `€522,50` |
| B2B Revenue | currency (EUR) | Direct B2B invoices | `€200,00` |
| Total Ad Spend | currency (EUR) | Meta + evt. andere kanalen | `€420,00` |
| Overall ROAS | number (formula) | `Total Revenue / Total Ad Spend` | `4,39` |
| Average CPA | currency (formula) | `Ad Spend / New Customers` | `€12,00` |
| Shopify Conversion Rate | number (%) | Orders / Sessions × 100 | `2,8` |
| New Customers | number | Unieke nieuwe klanten vandaag | `35` |
| Repeat Customers | number | Klanten met >1 order | `12` |
| Repeat Rate | number (%) | `Repeat / (New + Repeat) × 100` | `25,5` |
| Email Revenue | currency (EUR) | Revenue attributed aan email flows | `€310,00` |
| Email Revenue Share | number (%) | `Email Revenue / Total Revenue × 100` | `16,8` |
| B2B Leads Added | number | Nieuwe leads in B2B pipeline | `3` |
| B2B Pipeline Value | currency (EUR) | Som Estimated Monthly × 12 voor Engaged+ | `€48.000,00` |
| Inventory Status | singleSelect (Healthy / Watch / Critical) | Statuskleur voorraad hero product | `Healthy` |
| Active Campaigns | number | Status=Active in Campaigns tabel | `6` |
| Winner Ads Count | number | Winner Status=Winner in Ad Variants | `4` |

### Views
- **Last 30 days** — Date ≥ TODAY()-30, sorted Date desc
- **This week** — Date ≥ TODAY()-7
- **Red flags** — Inventory Status ≠ Healthy OR Overall ROAS < 2

---

## Table 16: Strategy Reports

Eén record per week. Wordt maandag 10:00 geschreven door `bamboo-weekly-strategy-report` n8n workflow. Claude-gegenereerde analyse.

| Field | Type | Beschrijving | Voorbeeld |
|-------|------|--------------|-----------|
| Week | singleLineText (primary) | ISO week notatie | `2026-W16` |
| Date | date | Maandag van de week | `2026-04-13` |
| Summary | longText (markdown) | Algemene samenvatting week | `## Overzicht\nROAS stabiel op 3,2...` |
| Top Wins | longText | Bulletlist sterke punten | `- Ongebleekt 3L 48 rollen +22% omzet\n- B2B Kantoren segment...` |
| Top Concerns | longText | Bulletlist zorgen | `- Shopify CR zakte naar 1,9%\n- Voorraad Blanc 3L kritiek...` |
| Recommendations | longText | 3 concrete aanbevelingen | `1. Creative refresh Ongebleekt 2L...\n2. B2B outreach opvoeren...` |
| Revenue This Week | currency (EUR) | Som omzet afgelopen week | `€11.420,00` |
| Revenue Last Week | currency (EUR) | Vorige week ter vergelijking | `€9.810,00` |
| Revenue Change | number (%, formula) | `(This - Last) / Last × 100` | `16,4` |
| ROAS Trend | singleSelect (Rising / Stable / Declining) | 7-daags gemiddelde vs vorige week | `Rising` |
| Action Items | longText | Check-afvinklijst voor Nathan | `- [ ] Meta Ads budget verhogen voor...\n- [ ] B2B email sequence...` |

### Views
- **All reports** — sorted Date desc
- **Revenue rising** — Revenue Change > 10
- **Needs attention** — Top Concerns IS NOT EMPTY AND Revenue Change < 0

---

## Table 17: Anomaly Log

Elke gedetecteerde afwijking een eigen row. Wordt geschreven door `bamboo-anomaly-detector` (elke 4 uur).

| Field | Type | Beschrijving | Voorbeeld |
|-------|------|--------------|-----------|
| Timestamp | dateTime (primary) | Moment van detectie | `2026-04-13 14:00` |
| Engine | singleSelect (Acquisition / Conversion / Revenue / Intelligence) | Welke engine de bron is | `Acquisition` |
| Type | singleSelect (CPA Spike / CR Drop / Inventory Low / Pipeline Stall / Email Drop / Ad Fatigue / Budget Overrun) | Type anomalie | `CPA Spike` |
| Severity | singleSelect (Critical / Warning / Info) | Ernstigheidsgraad | `Warning` |
| Description | longText | Wat er is gebeurd, Nederlands | `Gemiddelde CPA op Ongebleekt 3L 48 is gestegen naar €18,40 (baseline €11,20). Ad "hero-zacht-sterk-01" is de grootste boosdoener.` |
| Current Value | number | Huidige meting | `18,40` |
| Expected Value | number | Baseline (7-daags gem) | `11,20` |
| Deviation | number (%, formula) | `(Current - Expected) / Expected × 100` | `64` |
| Recommended Action | longText | Concrete actie | `Pause ad "hero-zacht-sterk-01" en test nieuwe creative uit hookbank (Voorraadrust angle)` |
| Resolved | checkbox | Gefixt ja/nee | `☐` |
| Resolution Notes | longText | Wat Nathan heeft gedaan | `Ad gepauzeerd, nieuwe variant live 13/04` |

### Views
- **Open anomalies** — Resolved = unchecked, sorted Severity (Critical first), Timestamp desc
- **Last 7 days** — Timestamp ≥ NOW()-7d
- **Critical only** — Severity = Critical AND Resolved = unchecked
- **Per engine** (gegroepeerd op Engine)

---

## Relaties tussen tabellen

Er zijn **geen harde links** tussen Daily KPIs / Strategy Reports / Anomaly Log — dit zijn allemaal aggregaten. De Intelligence Engine leest ze onafhankelijk en koppelt op datum waar nodig (in workflows en dashboard).

Leestoegang vanuit Intelligence Engine:
- Table 4 Campaigns (Engine 3)
- Table 5 Ad Variants (Engine 3)
- Table 7 Decisions Log (Engine 3)
- Conversion Tracking tabel (Engine 4)
- Customer Segments tabel (Engine 5)
- Email Performance tabel (Engine 5)
- B2B Leads tabel (Engine 5)

---

## Airtable formule-snippets (copy-paste)

**Overall ROAS** (Daily KPIs):
```
IF({Total Ad Spend} > 0, {Total Revenue} / {Total Ad Spend}, BLANK())
```

**Average CPA** (Daily KPIs):
```
IF({New Customers} > 0, {Total Ad Spend} / {New Customers}, BLANK())
```

**Repeat Rate** (Daily KPIs):
```
IF(({New Customers} + {Repeat Customers}) > 0,
   ({Repeat Customers} / ({New Customers} + {Repeat Customers})) * 100,
   0)
```

**Email Revenue Share** (Daily KPIs):
```
IF({Total Revenue} > 0, ({Email Revenue} / {Total Revenue}) * 100, 0)
```

**Revenue Change** (Strategy Reports):
```
IF({Revenue Last Week} > 0,
   (({Revenue This Week} - {Revenue Last Week}) / {Revenue Last Week}) * 100,
   BLANK())
```

**Deviation** (Anomaly Log):
```
IF({Expected Value} > 0,
   (({Current Value} - {Expected Value}) / {Expected Value}) * 100,
   BLANK())
```
