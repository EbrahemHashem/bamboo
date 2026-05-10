---
name: email-flow-builder
description: Bouw een Klaviyo email flow met Bamboo brand voice (nuchter, slim, niet activistisch, 2-van-3 kernregels). Input = flow type + doelgroep. Output = volledige email specs per stap, optioneel direct gepusht naar Klaviyo via API, anders markdown output voor handmatige import.
---

# /email-flow-builder — Bamboo Klaviyo Flow Builder

Je taak: complete email flow ontwerpen in Bamboo voice, inclusief triggers, delays, filters, en body copy. Output klaar voor Klaviyo import.

## Voorbeelden

```
/email-flow-builder "reorder flow voor 48 rollen klanten"
/email-flow-builder "winback voor churned klanten met >€200 LTV"
/email-flow-builder "B2B nurture voor Engaged leads uit kantoorsegment"
```

---

## Prerequisites

1. **Klaviyo API key** in `.env` (`KLAVIYO_API_KEY`)
2. **email-templates.md** gelezen voor ton en structuur
3. **brand-voice.md** en **CLAUDE.md** gelezen — 2-van-3 kernregels
4. Optioneel: Klaviyo MCP voor direct push, anders handmatige import

---

## Workflow

### Stap 1 — Ontleed de input
- **Flow type**: Welcome / Aftersales / Reorder / Winback / Upsell / B2B Nurture / Campaign
- **Doelgroep**: segment (Repeat / VIP / At Risk / Churned / specific product/volume)
- **Doel**: wat moet deze flow opleveren (1e aankoop, reorder, upgrade, meeting, etc.)

### Stap 2 — Bepaal structuur

**Standaard flow patronen:**

| Flow type | Aantal emails | Intervallen |
|-----------|---------------|-------------|
| Welcome | 3 | 1u / 2d / 5d |
| Aftersales | 2 | 3d / 10d |
| Reorder | 2 | op depletion date / +7d follow-up |
| Winback | 3 | 0d / 5d (met korting) / 12d (laatste kans) |
| Upsell | 2 | 7d na order 2 / +5d reminder |
| B2B Nurture | 4 | 0d / 5d / 12d / 21d |

### Stap 3 — Draft elke email

Voor elke email, lever aan:

```markdown
## Email {{ n }} — {{ name }}

**Trigger/Delay**: {{ trigger_details }}
**Filter**: {{ Klaviyo conditional filter }}
**Subject A/B**:
  A: {{ subject_a }}
  B: {{ subject_b }}
**Preview**: {{ preview_text }}

---

**Body:**

{{ dutch email body — 150-250 woorden max }}

---

**CTA**: {{ primary_button_text }} → {{ url/merge_tag }}

**Check:**
- [x] Geen "u" — altijd "je/jij"
- [x] Min 2 van 3 kernregels: {{ list hit kernregels }}
- [x] Geen activist-taal
- [x] Geen Engels (behalve product names)
- [x] Onder 250 woorden
```

### Stap 4 — Voice discipline

Bij genereren van copy, check altijd:
- Opening = praktische hook of waarde — niet duurzaamheid
- Hiërarchie: gebruikswaarde → productgevoel → duurzaamheid → gezondheid
- Nuchter, direct, gepast enthousiasme
- Sluit af met persoonlijke groet (Nathan) — niet corporate sign-off

**Verboden frasen (herschrijven):**
- "Red de planeet", "toekomst van onze kinderen", "samen maken we"
- "Premium quality bamboo toilet paper" (Engels)
- "Dear customer" / "Geachte"
- "!" in serieuze claims

### Stap 5 — Output naar Klaviyo (optioneel)

Als Klaviyo MCP beschikbaar of HTTP API:

```
POST https://a.klaviyo.com/api/flows/
Authorization: Klaviyo-API-Key {{ KLAVIYO_API_KEY }}
body: {
  "data": {
    "type": "flow",
    "attributes": {
      "name": "{{ flow_name }}",
      "status": "draft",
      "trigger_type": "{{ metric/segment/list }}",
      "definition": { ...steps met delays en messages... }
    }
  }
}
```

Anders: output volledige markdown die Nathan handmatig importeert in Klaviyo editor.

### Stap 6 — Registreer in Airtable

Voeg flow toe aan Email Performance tabel (status = Draft):

```
mcp__airtable__create_record
  base_id: {{ AIRTABLE_BASE_ID }}
  table: "Email Performance"
  fields: { "Flow Name": "...", "Type": "...", "Status": "Draft", "Last Updated": now, "Health": "Good" }
```

---

## Output aan Nathan

```
Email Flow Klaar — {{ flow_name }}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type:        {{ type }}
Doelgroep:   {{ segment }}
Emails:      {{ n }}
Totaal duur: {{ days }} dagen

Alle emails pass brand voice check.

Pushed naar Klaviyo: {{ yes/no — status draft }}
Airtable logged: ja (Email Performance)

Volgende stap:
  1. Check emails in Klaviyo editor
  2. Koppel Klaviyo Flow ID aan .env var
  3. Activeer flow (status: Live) na finale check
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
