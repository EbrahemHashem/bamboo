---
name: customer-segmenter
description: Pull alle Shopify klanten voor Bamboo Disposables, bereken segment (First Purchase/Repeat/VIP/At Risk/Churned/B2B), LTV tier, product & volume preference. Writes naar Airtable Customer Segments tabel. Basis voor reorder engine en winback flows.
---

# /customer-segmenter — Bamboo Customer Segmentation

Je taak: Shopify klantdata ophalen, classificeren per koopgedrag, en synchroniseren met Airtable zodat reorder, retention en B2B-systemen hierop kunnen bouwen.

---

## Prerequisites

1. **Shopify MCP** geconfigureerd — lees `SHOPIFY_STORE_URL` + `SHOPIFY_ACCESS_TOKEN` uit `.env`
2. **Airtable MCP** — `mcp__airtable__*` tools beschikbaar
3. **Airtable base "Bamboo Revenue"** — Table 11 Customer Segments bestaat (zie `airtable-schema-revenue.md`)
4. **CLAUDE.md** gelezen voor brand context

---

## Workflow

### Stap 1 — Haal Shopify klanten op

Gebruik Shopify MCP (of HTTP fallback) om alle customers + hun order history op te halen.

Per klant nodig:
- `customer.id`, `email`, `first_name + last_name`
- `orders_count`, `total_spent`
- Laatste 10 orders: `created_at`, `line_items[].title` (voor product/volume detectie)
- `tags` (check op "B2B" of "wholesale" tag)
- `addresses` — bedrijfsnaam in `company` veld = B2B signaal

### Stap 2 — Classificeer per klant

**Segment regels:**

| Segment | Criterium |
|---------|-----------|
| B2B | `company` address field is filled OR tag contains "B2B"/"wholesale" |
| First Purchase | `orders_count == 1` |
| Repeat | `orders_count >= 2 AND <= 4` |
| VIP | `orders_count >= 5 OR total_spent >= 300` |
| At Risk | `days_since_last_order` tussen 90-180 |
| Churned | `days_since_last_order >= 180` |

B2B override eerst. Daarna At Risk/Churned override Repeat/First Purchase als timing klopt.

**LTV Tier:**
- `High` — total_spent > €500
- `Medium` — €200-500
- `Low` — <€200

**Product Preference:**
Tel per klant voorkomens van "Ongebleekt 2" / "Ongebleekt 3" / "Blanc 3" in laatste 5 orders.
- 80%+ zelfde = die lijn
- Anders = Mixed

**Volume Preference:**
Tel voorkomens van 24/48/96 in order titels. Meest recente = volume preference.

### Stap 3 — Reorder likelihood

Gebaseerd op interval tussen laatste 2 orders:
- Interval <= verwacht depletion cycle (24r=60d, 48r=120d, 96r=240d) + 30d → **High**
- Interval <= cycle + 60d → **Medium**
- Anders → **Low**
- First Purchase klanten → **Medium** (nog geen history)
- Churned → **Low**

### Stap 4 — Bereken Predicted Reorder Date

`last_order_date + depletion_days_for_volume`.
Voor Mixed volume: gebruik meest recent gekochte volume.

### Stap 5 — Upsert naar Airtable

```
mcp__airtable__upsert_records  (of list → update/create combo)
  base_id: {{ AIRTABLE_BASE_ID }}
  table: "Customer Segments"
  key: "Customer ID"
  records: [
    { "Customer ID": "...", "Name": "...", "Email": "...", "Segment": "...",
      "Total Orders": N, "Total Revenue": X, "Last Order Date": "...",
      "Predicted Reorder Date": "...", "Reorder Likelihood": "...",
      "Product Preference": "...", "Volume Preference": "...",
      "B2B Flag": bool, "LTV Tier": "..." }
  ]
```

---

## Output aan Nathan

```
Klant Segmentatie Klaar — {{ date }}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Totaal klanten: {{ total }}
Nieuwe sinds vorige run: {{ new }}

Per segment:
  First Purchase:  {{ n1 }}
  Repeat:          {{ n2 }}
  VIP:             {{ n3 }}
  At Risk:         {{ n4 }}    → winback flow kandidaat
  Churned:         {{ n5 }}    → winback flow kandidaat
  B2B:             {{ n6 }}

LTV Tier:
  High (>€500):    {{ n7 }}
  Medium:          {{ n8 }}
  Low:             {{ n9 }}

Product Preference:
  Ongebleekt 3L:   {{ n10 }}  ← hero
  Ongebleekt 2L:   {{ n11 }}
  Blanc 3L:        {{ n12 }}
  Mixed:           {{ n13 }}

Acties:
  → {{ n4 + n5 }} klanten in winback pool
  → {{ reorder_pool }} klanten met Predicted Reorder Date in 30 dagen
  → {{ upsell_pool }} repeat klanten op 24 rollen → upsell kandidaat 48
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Error handling

- Shopify pagination: loop totdat alle klanten binnen zijn (50-250 per page)
- Klant zonder email → skip, log count
- Geen orders maar klant bestaat → skip (newsletter only, niet relevant voor segmentatie)
- Airtable rate limit → batch 10 per call, wait 200ms tussen batches

## Gebruik

Draait stand-alone (ad hoc) of wordt getriggerd door reorder/winback workflows. Aanrader: 1x per week handmatig checken + dagelijks via cron (toe te voegen aan n8n).
