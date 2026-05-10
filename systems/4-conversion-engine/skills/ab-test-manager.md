---
name: ab-test-manager
description: Interactieve A/B test manager voor Bamboo. Maakt tests aan (baseline + variant), lijst draaiende tests, declareert winnaars, archiveert afgeronde tests. Koppelt Page Variants aan AB Tests in Airtable.
---

# /ab-test-manager — Bamboo A/B Test Manager

Je beheert A/B tests op de Bamboo Shopify webshop. Nathan test page copy, hero elementen, pricing frames en bundel offers. Elke test heeft minimaal een baseline + 1 variant, beide moeten een URL of specifiek element hebben.

## Context files die je eerst leest

1. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/systems/4-conversion-engine/airtable-schema-conversion.md` — Table 9 AB Tests + Table 10 Page Variants
2. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/systems/4-conversion-engine/conversion-guardrails.md`
3. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/CLAUDE.md`

## Interactieve modi

Nathan roept je aan met 1 van deze commando's:

### `/ab-test-manager create`
Nieuwe test aanmaken. Vraag stap voor stap:
1. Test naam (kort, leesbaar) — bv. "Hero copy 3L 48 — waarde vs comfort"
2. Page / element — URL of element beschrijving
3. Product (uit 9 varianten lijst)
4. Variant A beschrijving (baseline) — moet een **bestaande Page Variant zijn in Airtable** of nieuwe Page Variant aanmaken
5. Variant B beschrijving (test variant) — idem

**Validatie** (harde regels):
- Beide varianten moeten een Page Variant record hebben in Airtable (Table 10)
- Beide moeten een URL of specifiek element referentie hebben
- Baseline mag niet identiek zijn aan variant
- Variant B moet door `conversion-guardrails.md` flow heen (2-van-3 OK, activist Clean)

Als validatie faalt → stop, leg uit wat mist, laat Nathan fixen voordat je de test aanmaakt.

Bij slagen:
- Genereer `Test ID`: `AB-{YYYY-MM}-{product-short}-{element-short}` (bv. `AB-2026-04-3L48-hero`)
- Schrijf record naar `AB Tests` tabel met `Status = Running`, `Start Date = vandaag`
- Update beide Page Variants: `Status = In AB Test`, `AB Test = {nieuwe test link}`
- Return: summary van de aangemaakte test + reminder dat Nathan de test handmatig in Shopify moet configureren (via een A/B test app zoals Intelligems, Shopify Testify, of native via discount codes)

### `/ab-test-manager list active`
Toon alle tests met `Status = Running`:

```markdown
## Actieve A/B tests ({N})

### {Test ID} — {Test Name}
- Product: {product}
- Start: {date} ({X} dagen actief)
- Variant A: {sessies} sessies, {orders} orders, CR {X}%
- Variant B: {sessies} sessies, {orders} orders, CR {Y}%
- Significant? {ja/nee — reden}
- Lift huidig: {X}%
```

Sorteer op lift (meest impactvolle bovenaan). Markeer significantie status (100+ sessies per variant EN >10% lift).

### `/ab-test-manager declare winner {test-id} {A|B}`
Handmatig een winner declareren (voor wanneer de auto-evaluator nog geen significantie vindt maar Nathan toch wil beslissen).

Vraag Nathan: "Weet je zeker dat je handmatig wil declareren? Auto-evaluator vereist 100+ sessies per variant en 10% lift. Huidige data: {samenvatting}"

Als bevestigd:
- Update `AB Tests`: `Status = Winner Declared`, `Winner = {A|B}`, `End Date = vandaag`, `Notes = "Handmatig gedeclareerd door Nathan op {date}: {reden indien opgegeven}"`
- Update winning Page Variant: `Status = Winner`
- Update losing Page Variant: `Status = Archived`

### `/ab-test-manager archive {test-id}`
Verplaats test naar archief. `Status = Archived`. Beide Page Variants `Status = Archived` (tenzij winner, die blijft `Winner`).

### `/ab-test-manager apply winner {test-id}`
Na declare winner → toont wat er live moet. Als Shopify write_products scope aan staat: stel voor om automatisch de winning variant te pushen. Altijd vragen om bevestiging voordat je écht write-api calls doet.

## Default gedrag bij aanroep zonder argument

Toon een menu:
```
/ab-test-manager — kies actie:
  create          — nieuwe test aanmaken
  list active     — draaiende tests
  list archived   — afgeronde tests
  declare winner  — handmatig winner markeren
  apply winner    — winning variant live rollen
  archive         — test naar archief
```

## MCP calls

- **Airtable**: `list_records` op AB Tests + Page Variants, `create_record`, `update_records`
- **Shopify** (alleen bij apply winner): `PUT /admin/api/2024-10/products/{id}.json` of metafields

## Brand guardrails

- Nederlands in alle output en vragen
- Nooit direct live applyen zonder Nathan's bevestiging
- Bij create: variant B moet guardrails halen — anders weigeren aan te maken
- Statistiek uitleg simpel houden: "je hebt 100+ sessies per kant nodig, en minstens 10% verschil in conversie, dan is het geen toeval"

## Voorbeeld flow create

```
Nathan: /ab-test-manager create
You: Oké, laten we een nieuwe test aanmaken. Wat is de test naam? (bv. "Hero 3L48 — waarde vs comfort")
Nathan: CTA button color
You: Die naam is te vaag — welke pagina en welk product? Ik heb iets nodig als "Bestel CTA kleur op 3L48 productpagina"
Nathan: Ja, op productpagina Ongebleekt 3L 48, CTA button test groen vs donker-groen
You: Duidelijk. Welke URL?
Nathan: https://bamboodisposables.nl/products/ongebleekt-3-laags-48
You: Heb je de beide varianten al als Page Variant in Airtable? Zo niet, maak ik ze aan. Variant A (baseline): welke kleur en copy?
...
You: Test aangemaakt: AB-2026-04-3L48-cta. Beide Page Variants zijn nu In AB Test.
Vergeet niet om de daadwerkelijke test in je Shopify A/B test tool te configureren (Intelligems/Testify).
```
