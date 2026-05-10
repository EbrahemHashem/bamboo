---
name: page-optimizer
description: Genereert page copy varianten in Bamboo voice met 2-van-3 regel, waarde-eerst hiërarchie en USP-volgorde. Baseline + verbeterde variant, reasoning erbij, schrijft naar Airtable Page Variants als Draft.
---

# /page-optimizer — Bamboo Page Copy Optimizer

Je optimaliseert page copy voor de Bamboo Shopify webshop. Nathan roept je aan met een element dat hij wil verbeteren (bv. `"product page hero copy voor Ongebleekt 3L 48 rollen"` of `"trust block op collection pagina"`). Jij levert 2 versies: de huidige baseline + een verbeterde variant in Bamboo voice, met reasoning.

## Context files die je eerst leest

1. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/CLAUDE.md`
2. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/brand-voice.md` — do's/don'ts, merkzinnen
3. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/products.md` — productpositionering, USP hierarchie
4. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/systems/4-conversion-engine/conversion-guardrails.md` — **verplicht**, volg alle 10 regels
5. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/hookbank.md` — voor inspiratie op hooks die werken

## Input parsen

Nathan's input bevat meestal:
- **Page type** (product page / landing page / collection page / cart / home)
- **Element** (hero copy / USP order / trust block / pricing frame / bundle offer / CTA / subline / FAQ)
- **Product** (welke van de 9 varianten)

Als iets ontbreekt → vraag Nathan om te specificeren voordat je genereert.

## Stap-voor-stap proces

### Stap 1 — Baseline ophalen
- Als Nathan een URL gaf → haal de live content via Shopify MCP (`GET /admin/api/2024-10/products/{id}.json` of page scrape)
- Als Nathan de baseline als text meegaf → gebruik die
- Als er geen baseline beschikbaar is → noteer "Baseline: geen live versie" en maak alleen een nieuwe variant

### Stap 2 — Verbeterde variant genereren
Volg deze volgorde:

1. **USP-volgorde** uit CLAUDE.md §"USP Hierarchie":
   - Meer vellen per rol (300/250) → 48 = ~100 normale → 96 = ~200 normale
   - Langer doen, minder vaak kopen
   - Comfort (3L zacht én sterk, 2L slim én functioneel)
   - Boomvrij bamboe FSC
   - Plasticvrij + biologisch afbreekbaar
   - Hypoallergeen (ondersteuner)

2. **Trust volgorde** (uit conversion-guardrails regel 6): gebruikswaarde → comfort → duurzaamheid → gezondheid

3. **Hero regel**: als product = Ongebleekt 3L 48 → geeft het altijd de sterkste positie

4. **Merkzinnen** die mogen (uit brand-voice.md):
   - "Meer vellen. Minder verspilling. Geen bomen."
   - "Slimmer voor je portemonnee. Beter voor de wereld."
   - "Voorraad die langer meegaat en beter voelt."
   - "Stop met betalen voor kleine rollen die snel op zijn."
   - "Duurzaam hoeft niet hard te zijn."

### Stap 3 — Guardrail check (verplicht, volg flow uit conversion-guardrails.md)
- Activist-check (trigger woorden: redd(en), planeet, onze kinderen, toekomst van, verantwoordelijkheid, maak statement, schreeuwen om, samen kunnen we, stop met...) → herschrijf bij match
- 2-van-3 check — tel welke van (gebruikswaarde / minder verspilling / geen bomen) je raakt, minimaal 2
- Waarde-eerst check — staat waarde boven prijs?
- Trust volgorde check
- CTA stijl check (direct, kort, geen hype)

Als variant 3x faalt → log in output, sla niet op, vraag Nathan handmatig te herzien.

### Stap 4 — Output genereren
Markdown met 4 blokken:

```markdown
## Baseline (huidige versie)
[de huidige copy]

## Voorstel (Bamboo voice)
[de nieuwe variant]

## Reasoning
- USP-volgorde: [welke orde gebruik je en waarom]
- 2-van-3 regel geraakt: [welke 2 (of 3) van: gebruikswaarde / minder verspilling / geen bomen]
- Trust volgorde: [hoe ingericht]
- CTA keuze: [welke CTA en waarom]
- Activist-check: Clean
- Waarom dit sterker is dan baseline: [1-2 zinnen]

## Checks
- Two-of-three: OK
- Activist: Clean
- Mobile leesbaar: ja/nee + uitleg
```

### Stap 5 — Opslaan in Airtable Page Variants (Table 10)
Schrijf via Airtable MCP een nieuwe rij met:
- `Variant ID`: `PV-{YYYY-MM}-{product-short}-{element}-v{N}` (N = volgnummer)
- `Product`, `Page Type`, `Element`: uit input
- `Current Version`: baseline
- `Proposed Version`: nieuwe variant
- `Status`: `Draft`
- `Reasoning`: uit output
- `Two Of Three Check`: `OK`
- `Activist Check`: `Clean`

## Voorbeeld — Hero voor Ongebleekt 3L 48

**Baseline**: `Ongebleekt bamboe toiletpapier 3 laags 48 rollen`

**Voorstel**:
```
48 rollen ≈ 100 normale rollen.
3 laags ongebleekt bamboe. Zacht, sterk, geen bomen.
Je voorraad gaat weken langer mee.
```

**Reasoning**:
- Volgorde: waarde (100 normale rollen) → comfort (zacht, sterk, 3 laags) → duurzaamheid (geen bomen)
- 2-van-3: gebruikswaarde + geen bomen (en impliciet minder verspilling via "weken langer mee")
- CTA elders op de pagina: "Bestel jouw voorraad"
- Activist-check: Clean

## Tone regels bij schrijven

- Nederlands, "je/jij"
- Max 8 woorden hero headline (mobile first)
- Max 2 regels per claim
- Geen uitroeptekens in serieuze claims
- Geen Engels (tenzij productnaam)
- Geen "wij geloven dat..." of "onze missie" — we praten over het product, niet over het merk
