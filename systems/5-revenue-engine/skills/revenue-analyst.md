---
name: revenue-analyst
description: Analyseer Bamboo Shopify + Klaviyo data — LTV, repeat rate, cohort behavior, AOV trend, email revenue attribution, B2B pipeline value. Output = Dutch markdown rapport met concrete aanbevelingen per segment. Geen fluff.
---

# /revenue-analyst — Bamboo Revenue Analyst

Je taak: van ruwe Shopify en Klaviyo data naar actionable insights. Wekelijks rapport voor Nathan, geen vage cijfers — alleen wat hem helpt besluiten nemen.

---

## Prerequisites

1. **Shopify MCP** — orders, customers, products
2. **Klaviyo API** — flow revenue attribution, campaign stats
3. **Airtable MCP** — Customer Segments, Reorder Signals, Email Performance, B2B Leads
4. **CLAUDE.md** brand context — hero is Ongebleekt 3 laags 48 rollen

---

## Workflow

### Stap 1 — Data verzamelen

**Shopify (laatste 90/180/365 dagen):**
- Totaal orders + revenue
- Unique customers
- AOV (average order value)
- Repeat rate (= klanten met 2+ orders / totaal klanten)
- Per product volume breakdown (24/48/96)
- Per productlijn breakdown (Ongebleekt 2L/3L/Blanc 3L)

**Klaviyo (laatste 30 dagen):**
- Revenue per flow (Welcome, Aftersales, Reorder, Winback, Upsell)
- Campaign revenue
- Email-attributed revenue als % van totaal

**Airtable Customer Segments:**
- Count per segment
- LTV tier distribution
- B2B vs B2C split

**Airtable Reorder Signals:**
- Reminders verstuurd laatste 30d
- Reorder match rate (= Reordered=true / Reminder Sent=true)
- Revenue from Reorder totaal

**Airtable B2B Leads:**
- Pipeline value per stage (sum of Estimated Monthly Value)
- Conversion rates tussen stages
- Closed Won in periode

### Stap 2 — Bereken key metrics

```
LTV (rolling 365d) = Total Revenue 365d / Unique Customers 365d
Repeat Rate (90d) = Klanten met 2+ orders 90d / Klanten 90d
AOV = Total Revenue / Total Orders
CAC terugverdientijd = CAC / AOV × aankoopfrequentie
Email % of Revenue = Klaviyo Attributed Revenue / Total Shopify Revenue
Reorder Conversion = Reordered=true (binnen 45d van reminder) / Reminders Sent
B2B MRR Pipeline = sum(Estimated Monthly Value WHERE Stage IN (Engaged, Meeting Booked, Proposal Sent))
```

### Stap 3 — Cohort analyse

Groepeer klanten per eerste-order-maand. Voor elk cohort:
- Retention rate maand 1, 3, 6, 12
- LTV na 6 maanden
- % dat upgradet naar 96 rollen

Vergelijk cohorten: zien we verbetering na start Revenue Engine?

### Stap 4 — Product mix analyse

Voor elke productlijn + volume:
- % van omzet
- Marge (uit products.md of Shopify)
- Repeat rate per product
- Cross-sell pattern (klanten die 24 → 48 → 96 gaan)

**Sleutel vraag:** hoe presteert hero Ongebleekt 3 laags 48 rollen vs alternatieven?

### Stap 5 — Gap analyse

Waar lekt omzet?
- At Risk klanten (90-180d) die geen winback ontvingen → hoeveel potentie?
- Reorder reminders niet verstuurd door data gaps → hoeveel klanten?
- B2B leads stuck op Engaged > 14 dagen → hoeveel pipeline bevriest?
- Klaviyo flows met <20% open → hoeveel revenue misgelopen?

### Stap 6 — Concrete aanbevelingen

Voor elke gap: 1-3 acties in volgorde van ROI.

Voorbeeld:
> **Gap**: 127 klanten in At Risk segment, geen winback email verstuurd.
> **Actie**: Trigger winback flow batch — expected recovery bij 10% conversie = 12-13 klanten × €38 AOV = €475 revenue.
> **Uitvoer**: run `/email-flow-builder "winback voor At Risk 90-180d"` + activeer Klaviyo flow.

---

## Output — Dutch markdown rapport

```markdown
# Bamboo Revenue Report — {{ week nummer / datum range }}

## Executive Summary

**Revenue deze periode:** €{{ revenue }} ({{ delta }}% vs vorige periode)
**Nieuwe klanten:** {{ n_new }}
**Repeat rate (90d):** {{ rate }}%
**Email % van omzet:** {{ pct }}%
**B2B pipeline value (MRR):** €{{ mrr }}/mnd

### Sleutel-inzicht
{{ 1-2 zinnen die het belangrijkste patroon benoemen }}

---

## 1. Customer base

| Segment | Count | Δ vs vorige | LTV |
|---------|-------|-------------|-----|
| First Purchase | {{ n }} | {{ Δ }} | €{{ ltv }} |
| Repeat | {{ n }} | {{ Δ }} | €{{ ltv }} |
| VIP | {{ n }} | {{ Δ }} | €{{ ltv }} |
| At Risk | {{ n }} | {{ Δ }} | €{{ ltv }} |
| Churned | {{ n }} | {{ Δ }} | — |
| B2B | {{ n }} | {{ Δ }} | €{{ ltv }} |

**Observation**: {{ bv. "VIP segment groeit 12% MoM, hoofdzakelijk vanuit Repeat upgraders naar 96 rollen" }}

---

## 2. Product mix

| Product | % omzet | Repeat rate | Marge |
|---------|---------|-------------|-------|
| Ongebleekt 3L 48 rollen (hero) | {{ % }} | {{ % }} | {{ % }} |
| Ongebleekt 3L 96 rollen | {{ % }} | {{ % }} | {{ % }} |
| Ongebleekt 2L 48 rollen | {{ % }} | {{ % }} | {{ % }} |
| Blanc 3L 48 rollen | {{ % }} | {{ % }} | {{ % }} |
| Overige | {{ % }} | — | — |

**Hero check**: Ongebleekt 3L 48 rollen = {{ % }} van omzet. Doel ≥ 35%.

---

## 3. Email performance

| Flow | Sends | Open | Click | Revenue | Health |
|------|-------|------|-------|---------|--------|
| Welcome | {{ n }} | {{ % }} | {{ % }} | €{{ r }} | {{ status }} |
| Aftersales | {{ n }} | {{ % }} | {{ % }} | €{{ r }} | {{ status }} |
| Reorder 48 | {{ n }} | {{ % }} | {{ % }} | €{{ r }} | {{ status }} |
| Winback | {{ n }} | {{ % }} | {{ % }} | €{{ r }} | {{ status }} |
| Upsell 24→48 | {{ n }} | {{ % }} | {{ % }} | €{{ r }} | {{ status }} |

**Email revenue share**: {{ pct }}% van totaal. Doel ≥ 20%.

---

## 4. Reorder engine

- Reminders verstuurd (30d): {{ n }}
- Reorders gematcht: {{ n }}
- Conversie: {{ % }} ({{ doel: >25% }})
- Revenue from reorders: €{{ r }}

**Action**: {{ bv. "48r flow heeft 18% conversie, 24r op 31% — onderzoek waarom 48r lager scoort, mogelijk prijs-pitch in email herkadreren" }}

---

## 5. B2B pipeline

| Stage | Count | Value (MRR) |
|-------|-------|-------------|
| New | {{ n }} | €{{ mrr }} |
| Contacted | {{ n }} | €{{ mrr }} |
| Engaged | {{ n }} | €{{ mrr }} |
| Meeting Booked | {{ n }} | €{{ mrr }} |
| Proposal Sent | {{ n }} | €{{ mrr }} |
| Closed Won | {{ n }} | €{{ mrr }} |
| Closed Lost | {{ n }} | — |

Stage conversion:
- New → Contacted: {{ % }}
- Contacted → Engaged: {{ % }}
- Engaged → Meeting: {{ % }}
- Meeting → Won: {{ % }}

**Stuck leads**: {{ n }} leads > 14 dagen op Engaged zonder volgende stap.

---

## 6. Aanbevelingen deze week

1. **{{ top action met ROI }}** — {{ concrete uitvoer }} — verwachte impact: €{{ X }}.
2. **{{ 2e action }}** — {{ ... }}.
3. **{{ 3e action }}** — {{ ... }}.

---

## 7. Health check

Brand voice guardrails:
- Email flows met activist-taal gedetecteerd: {{ n }} (actie nodig: {{ y/n }})
- Outreach met ontbrekende kernregels: {{ n }}

---

**Volgende rapport**: {{ date }}
```

---

## Error handling

- Klaviyo data niet beschikbaar → rapport zonder email sectie, flag in output
- Shopify timeout → gebruik Airtable Customer Segments als proxy
- Geen B2B leads in base → sectie overslaan, niet faken
- Nooit cijfers verzinnen bij data gap — altijd transparant "data missing"

## Gebruik

Wekelijks handmatig (elke maandag) of automatisch via n8n cron. Rapport mailen naar Nathan + archiveren in `~/projects/mac-mini-builds/bamboo/reports/{{ YYYY-WW }}.md`.
