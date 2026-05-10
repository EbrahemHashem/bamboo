---
name: b2b-outreach
description: Genereer gepersonaliseerde B2B cold outreach email voor Bamboo — nuchter/zakelijk, niet activistisch, waarde-eerst. Input = lead context (sector, company, size). Output = subject + body, klaar om te versturen via Gmail of copy-paste.
---

# /b2b-outreach — Bamboo B2B Outreach

Je taak: persoonlijke B2B cold openers schrijven die voelen als menselijk contact, niet massa-mail. Bamboo voice: nuchter, concreet, geen activisme.

## Voorbeelden

```
/b2b-outreach "pitch voor Yoga studio Amsterdam, klein 2 zaaltjes"
/b2b-outreach "Hotel Boutique Brouwer, 18 kamers, Amsterdam centrum"
/b2b-outreach "TechStartup XYZ, 35 medewerkers, kantoor Utrecht"
/b2b-outreach "Basisschool De Regenboog, 280 leerlingen, Haarlem"
```

---

## Prerequisites

1. **b2b-target-groups.md** gelezen — 4 sector pitches
2. **brand-voice.md** en **CLAUDE.md** — 2-van-3 kernregels + geen activist-taal
3. **Airtable B2B Leads** — lead record bestaat (via `/b2b-prospector`)
4. Optioneel Gmail MCP voor direct versturen

---

## Workflow

### Stap 1 — Parse input

Extract:
- **Sector** → match met b2b-target-groups.md (Kantoor / School / Wellness / Hospitality)
- **Company name**
- **Size indicator** (medewerkers / kamers / leerlingen / zaaltjes)
- **Regio**
- **Observed angle** (natuurlijk, premium, rustgevend, etc.) — uit website of social
- **Contact persoon** (indien bekend) → first_name

Als input te vaag: stel 1-2 gerichte vragen aan Nathan en ga door met best-guess.

### Stap 2 — Kies pitch angle per sector

**Kantoor** — "representatief + minder bestelmomenten + duurzaamheidsverhaal dat concreet is"
**School** — "meer vellen per rol = minder vervangmomenten + concreet verhaal naar ouders"
**Wellness** — "past visueel bij jullie vibe + hypoallergeen + verhaal klopt met branding"
**Hospitality** — "gast-ervaring + Booking sustainable badge + logistiek voordeel"

### Stap 3 — Genereer subject (3 opties)

Pattern: zakelijk, concreet, niet clickbait.

Voorbeelden:
- "Betere toiletpapier op kantoor — zonder gedoe"
- "TP voor {{ company }} — 2x meer vellen per rol"
- "Ongebleekt TP voor {{ company }}"
- "Bamboe TP voor {{ company }} — past bij gast-verhaal"
- "Toiletpapier voor {{ school }} — 2x meer vellen per rol"

Geen "🎉" of "Actie!" of emoji's.

### Stap 4 — Draft body

**Structuur (max 120 woorden):**
1. **Opener**: 1 zin waar je laat zien dat het geen mass-mail is. Iets specifieks noemen (website, reviews, positionering, locatie).
2. **Praktische vraag of observatie**: 1 zin. Hoe lossen ze dit nu op?
3. **Aanbod in 2-3 bullets**: concrete cijfers (vellen per rol, doos volume, €/maand estimate).
4. **Sector-specifieke hook**: 1 zin waarom dit bij hun context past (ESG, vibe, gastervaring).
5. **CTA**: 1 korte vraag (samples? 15 min call? reply?).
6. **Ondertekening**: "Groet, Nathan — Bamboo Disposables"

**Voorbeelden per sector** staan in `b2b-target-groups.md` — gebruik als template, niet copy-paste.

### Stap 5 — Voice check

Voordat je de email oplevert, check:
- [ ] Max 120 woorden body
- [ ] Geen "u" — altijd "je/jij" (of neutrale constructie bij onbekende first_name)
- [ ] Min 2 van 3 kernregels: gebruikswaarde / minder verspilling / geen bomen
- [ ] Geen activist-taal ("red", "planeet", "samen", "verantwoordelijkheid")
- [ ] Geen Engels (behalve product name indien Blanc)
- [ ] Concrete cijfers (niet "veel", maar "300 vel", "96 rollen", "€150/maand")
- [ ] Eén CTA, niet 3
- [ ] Signoff = Nathan — Bamboo Disposables

Als één check faalt → herschrijven.

### Stap 6 — Output

```markdown
# B2B Outreach — {{ company_name }}

**Sector:** {{ sector }}
**Lead ID:** {{ lead_id }}

## Subject opties
A: {{ subject_a }}
B: {{ subject_b }}
C: {{ subject_c }}

## Body

{{ email body }}

Groet,
Nathan — Bamboo Disposables

---

**Kernregels check:**
- [x] Gebruikswaarde: {{ hit met "300 vel per rol / 96 rollen" }}
- [x] Minder verspilling: {{ hit met "minder bestelmomenten" }}
- [x] Geen bomen: {{ hit met "boomvrij bamboe" }}

**Volgende actie:** verstuur via Gmail (met Nathan's adres) of copy-paste in eigen mail client.
Update Airtable B2B Leads: Stage → "Contacted", Last Contact Date → today, Outreach Messages += 1.
```

### Stap 7 — Optioneel: verstuur + log

Als Nathan `send: true` meegeeft:
```
mcp__claude_ai_Gmail__gmail_create_draft
  to: "{{ contact_email }}"
  subject: "{{ subject_a }}"
  body: "{{ body }}"
```

Dan altijd Airtable update:
```
mcp__airtable__update_records
  table: "B2B Leads"
  records: [{ id: "{{ record_id }}", fields: { "Stage": "Contacted", "Last Contact Date": today, "Outreach Messages": {{ n+1 }}, "Next Action": "Follow-up in 5 dagen bij geen reply" } }]
```

---

## Follow-up patronen

Als Nathan vraagt om follow-up (na 5-7 dagen zonder reply):

**Follow-up 1 (nuchter, value-add):**
> Hey {{ first_name }}, korte bump — geen druk. Eerder mailde ik over bamboe TP voor {{ company }}. Stuurde net een sample-folder naar een vergelijkbaar {{ sector }} in {{ regio }}, misschien nuttig. Zal ik jullie ook een doos sturen om te testen?

**Follow-up 2 (laatste poging, 14 dagen later):**
> Hey {{ first_name }}, laatste mail van mij. Als TP niet top of mind is: helemaal begrijpelijk. Als je later wel eens wilt kijken: www.bamboodisposables.nl staat klaar. Groet, Nathan.

Dan Airtable: Stage → blijft "Contacted" (of "Closed Lost" na 2e follow-up zonder reply).

---

## Gebruik

Nathan runt deze per lead of bulk. Werkt ook als input voor `/respond-to-leads` voor reply-based outreach.
