# Airtable Schema — Systeem 5 Revenue Engine

Extra tabellen bovenop Systeem 1/3 base. Base naam: **Bamboo Revenue** (of toevoegen aan bestaande base).

---

## Table 11: Customer Segments

Klant-niveau segmentatie, sync vanuit Shopify via `/customer-segmenter`.

| Field | Type |
|-------|------|
| Customer ID | singleLineText (primary, Shopify customer ID) |
| Name | singleLineText |
| Email | email |
| Segment | singleSelect (First Purchase / Repeat / VIP / At Risk / Churned / B2B) |
| Total Orders | number |
| Total Revenue | currency (€) |
| Average Order Value | formula ({Total Revenue} / {Total Orders}) |
| Last Order Date | date |
| Days Since Last Order | formula (DATETIME_DIFF(TODAY(), {Last Order Date}, 'days')) |
| Predicted Reorder Date | date (berekend door /reorder-engine: laatste order + depletion cycle) |
| Reorder Likelihood | singleSelect (High / Medium / Low) |
| Product Preference | singleSelect (Ongebleekt 2L / Ongebleekt 3L / Blanc 3L / Mixed) |
| Volume Preference | singleSelect (24 / 48 / 96) |
| B2B Flag | checkbox |
| LTV Tier | singleSelect (High >500 / Medium 200-500 / Low <200) |

**Segmentatie regels:**
- **First Purchase** — Total Orders = 1
- **Repeat** — Total Orders 2-4
- **VIP** — Total Orders >= 5 OR Total Revenue >= €300
- **At Risk** — Days Since Last Order tussen 90-180
- **Churned** — Days Since Last Order >= 180
- **B2B** — B2B Flag = true (override andere segmenten)

---

## Table 12: Email Performance

Klaviyo flow health tracking, sync dagelijks via `bamboo-retention-flow-monitor.json`.

| Field | Type |
|-------|------|
| Flow Name | singleLineText (primary, Klaviyo flow naam) |
| Type | singleSelect (Welcome / Aftersales / Reorder / Winback / Upsell / B2B Nurture / Campaign) |
| Status | singleSelect (Active / Paused / Draft) |
| Sends | number (laatste 7 dagen) |
| Open Rate | number (%, laatste 7 dagen) |
| Click Rate | number (%, laatste 7 dagen) |
| Revenue Attributed | currency (€, laatste 7 dagen) |
| Unsubscribe Rate | number (%, laatste 7 dagen) |
| Last Updated | dateTime |
| Health | singleSelect (Good / Needs Attention / Critical) |

**Health regels (gezet door n8n function node):**
- **Good** — Open >25%, Click >2%, Unsub <0.5%
- **Needs Attention** — Open 20-25% OF Click 1-2% OF daling >15% vs vorige week
- **Critical** — Open <20% OF Unsub >1% OF daling >30% vs vorige week → Telegram alert

---

## Table 13: B2B Leads

B2B pipeline, gevuld door `/b2b-prospector` en `/respond-to-leads`.

| Field | Type |
|-------|------|
| Lead ID | singleLineText (primary, auto-gegenereerd: `B2B-{timestamp}-{shortname}`) |
| Company Name | singleLineText |
| Sector | singleSelect (Kantoor / School / Wellness / Hospitality / Sport / Retail / Anders) |
| Contact Name | singleLineText |
| Contact Email | email |
| Contact Phone | phoneNumber |
| Source | singleSelect (Outbound / Inbound / Referral / Website) |
| Stage | singleSelect (New / Contacted / Engaged / Meeting Booked / Proposal Sent / Closed Won / Closed Lost) |
| Interest Level | singleSelect (High / Medium / Low / Unknown) |
| Last Contact Date | date |
| Next Action | singleLineText |
| Estimated Volume | singleSelect (24 / 48 / 96 / Bulk >96 per maand) |
| Estimated Monthly Value | currency (€) |
| Notes | longText |
| Outreach Messages | number (aantal verstuurde berichten) |

**Stage flow:**
`New → Contacted → Engaged → Meeting Booked → Proposal Sent → Closed Won / Closed Lost`

---

## Table 14: Reorder Signals

Reorder timing tracking, gevuld door `/reorder-engine` en `bamboo-reorder-trigger.json`.

| Field | Type |
|-------|------|
| Signal ID | singleLineText (primary, auto: `RS-{customerId}-{timestamp}`) |
| Customer ID | multipleRecordLinks (→ Customer Segments) |
| Last Order Date | date |
| Last Order Product | singleLineText (bv. "Ongebleekt 3 laags 48 rollen") |
| Last Order Quantity | number |
| Estimated Depletion Date | date (berekend: 24r=60d, 48r=120d, 96r=240d na last order) |
| Reminder Sent | checkbox |
| Reminder Date | date |
| Reordered | checkbox |
| Reorder Date | date |
| Revenue from Reorder | currency (€) |

**Depletion cycles (gemiddeld gezin 2-3 personen):**
- **24 rollen** → 60 dagen
- **48 rollen** → 120 dagen
- **96 rollen** → 240 dagen

Reminder window: stuur reminder als `Estimated Depletion Date - TODAY() <= 14 dagen` én `Reminder Sent = false`.

---

## Referentie relaties

- Table 14 (Reorder Signals) → Table 11 (Customer Segments) via Customer ID
- Table 11 (Customer Segments) kan later linked naar Table 12 (Email Performance) voor attributie
- Table 13 (B2B Leads) standalone — B2B klanten komen pas in Table 11 als Closed Won + eerste Shopify order gedaan
