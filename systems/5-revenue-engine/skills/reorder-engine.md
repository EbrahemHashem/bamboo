---
name: reorder-engine
description: Bereken per Bamboo klant wanneer hun voorraad opraakt (24r=60d, 48r=120d, 96r=240d), flag klanten met depletion binnen 14 dagen, trigger Klaviyo reorder reminder flow per volume, log signaal in Airtable. Voorkomt dubbele reminders.
---

# /reorder-engine — Bamboo Reorder Timing Engine

Je taak: voorspellen wanneer elke klant zonder voorraad komt en op het juiste moment een reorder reminder triggeren. Backbone van repeat-rate verhoging.

---

## Prerequisites

1. **Shopify MCP** — voor order history
2. **Airtable MCP** — Customer Segments + Reorder Signals tabellen
3. **Klaviyo API** — reorder flows live met Flow IDs in `.env`:
   - `KLAVIYO_REORDER_24_FLOW_ID`
   - `KLAVIYO_REORDER_48_FLOW_ID`
   - `KLAVIYO_REORDER_96_FLOW_ID`
4. **email-templates.md** — voor messaging context

---

## Depletion logica

Gemiddeld gezin 2-3 personen verbruikt:
| Volume | Depletion cycle |
|--------|-----------------|
| 24 rollen | 60 dagen |
| 48 rollen | 120 dagen |
| 96 rollen | 240 dagen |

Reminder window: stuur reminder als `estimated_depletion_date - today <= 14 dagen` EN `reminder_sent = false`.

Als `today > estimated_depletion_date + 7`: skip (die klant is al voorbij het reorder moment, pakken we op met winback flow).

---

## Workflow

### Stap 1 — Haal kandidaat klanten op

Twee opties:
1. **Vanuit Airtable** (snel): Customer Segments waar `Reorder Likelihood != Low` EN `Predicted Reorder Date` binnen 14 dagen
2. **Vanuit Shopify** (volledig): haal alle orders van laatste 250 dagen, groepeer per klant, neem laatste order per klant

Default: gebruik Airtable (want `/customer-segmenter` heeft dit al berekend). Fallback Shopify als Airtable leeg.

### Stap 2 — Bereken per klant

Voor elke kandidaat:
```
volume = last_order_quantity (24/48/96)
cycle_days = { 24: 60, 48: 120, 96: 240 }[volume]
estimated_depletion = last_order_date + cycle_days
days_until_depletion = estimated_depletion - today

needs_reminder = (days_until_depletion <= 14) AND (days_until_depletion > -7) AND (no existing reminder in last 90d)
```

Check Airtable Reorder Signals tabel voor bestaande `Reminder Sent = true AND Reminder Date > (today - 90d)` → skip.

### Stap 3 — Log signaal in Airtable

```
mcp__airtable__create_record
  table: "Reorder Signals"
  fields: {
    "Signal ID": "RS-{customer_id}-{timestamp}",
    "Customer ID": [link naar Customer Segments record],
    "Last Order Date": "...",
    "Last Order Product": "Ongebleekt 3 laags 48 rollen",
    "Last Order Quantity": 48,
    "Estimated Depletion Date": "...",
    "Reminder Sent": false,
    "Reminder Date": null,
    "Reordered": false
  }
```

### Stap 4 — Trigger Klaviyo flow

Per klant, bepaal juist metric/flow op basis van volume:

```
POST https://a.klaviyo.com/api/events/
Authorization: Klaviyo-API-Key {{ KLAVIYO_API_KEY }}
revision: 2024-02-15
body: {
  "data": {
    "type": "event",
    "attributes": {
      "metric": { "data": { "type": "metric", "attributes": { "name": "Reorder Reminder {{ volume }}" } } },
      "profile": { "data": { "type": "profile", "attributes": { "email": "{{ email }}" } } },
      "properties": {
        "last_order_date": "...",
        "last_product": "...",
        "volume": {{ volume }},
        "depletion_date": "...",
        "days_until_depletion": {{ n }}
      }
    }
  }
}
```

De flow in Klaviyo (metric trigger: "Reorder Reminder 48" bv.) pikt dit event op en start de emails (zie `email-templates.md` templates 3 en 4).

### Stap 5 — Update Airtable

```
Reminder Sent = true
Reminder Date = today
```

### Stap 6 — Opvolging tracking

Na 30 dagen: run vergelijk tegen Shopify orders. Als klant in tussentijd een order heeft → update `Reordered = true`, `Reorder Date`, `Revenue from Reorder`. Dit geeft de conversie-rate van de engine.

---

## Output aan Nathan

```
Reorder Engine — {{ date }}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Klanten gecheckt:           {{ total }}
Reminder window (14d):      {{ flagged }}
Reeds gereminderd (skip):   {{ skipped }}
Nieuwe reminders verstuurd: {{ sent }}

Per volume:
  24 rollen:  {{ n24 }} reminders
  48 rollen:  {{ n48 }} reminders  ← hero volume
  96 rollen:  {{ n96 }} reminders

Performance (laatste 30d):
  Reminders verstuurd: {{ prev_sent }}
  Reorders gematcht:   {{ matched }}
  Conversie rate:      {{ rate }}%
  Revenue uit reorders: €{{ revenue }}

Alles gelogd in Airtable Reorder Signals.
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Error handling

- Klaviyo 429: back off 5s en retry (max 3x)
- Klaviyo 400 (unknown email): log in Airtable als "Reminder Sent = false, Notes = invalid email"
- Shopify timeout: fallback naar Airtable Customer Segments data
- Als Klaviyo flow ID niet bestaat (metric name mismatch): stop en waarschuw Nathan

## Gebruik

Dagelijks via `bamboo-reorder-trigger.json` (n8n workflow). Handmatig als Nathan wil debuggen of single customer check.
