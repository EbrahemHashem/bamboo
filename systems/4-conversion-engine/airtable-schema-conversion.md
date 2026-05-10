# Airtable Schema — Systeem 4 Conversion Engine

Extra tabellen bovenop Systeem 1 en 3 in dezelfde "Bamboo Ad Research" base.

---

## Table 8: Conversion Tracking

Dagelijkse conversie data per product × kanaal × campagne. Wordt elke 6 uur bijgewerkt door `bamboo-conversion-monitor.json`.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| Date | date (primary) | Rapportagedatum | 2026-04-13 |
| Campaign ID | multipleRecordLinks (→ Campaigns Systeem 3) | Link naar campagne uit Systeem 3 | `Bamboo - Hero - Ongebleekt 3L 48` |
| Product | singleSelect (Ongebleekt 2L 24 / 2L 48 / 2L 96 / Ongebleekt 3L 24 / 3L 48 / 3L 96 / Blanc 3L 24 / 3L 48 / 3L 96 / Overig) | Welk product | `Ongebleekt 3L 48` |
| Channel | singleSelect (Meta Ads / Organic IG / Bol.com / Direct / B2B / Email) | Bron van traffic | `Meta Ads` |
| Page URL | url | Landingspagina | `https://bamboodisposables.nl/products/ongebleekt-3-laags-48` |
| Sessions | number | Unieke sessies op die pagina | 312 |
| Add to Cart | number | ATC events | 48 |
| Checkouts Started | number | Checkout started events | 21 |
| Orders | number | Bevestigde orders | 14 |
| Revenue | currency (EUR) | Bruto omzet | 392.00 |
| Conversion Rate | formula (`{Orders} / {Sessions}`) | Orders per sessie | 0.045 |
| Cart Abandonment Rate | formula (`1 - ({Orders} / {Add to Cart})`) | % die ATC maar niet bestelt | 0.71 |
| Ad Spend | currency (EUR) | Spend uit Systeem 3 (gekoppeld via Campaign ID) | 85.40 |
| CPA | formula (`{Ad Spend} / {Orders}`) | Kosten per aankoop | 6.10 |
| ROAS | formula (`{Revenue} / {Ad Spend}`) | Return on ad spend | 4.59 |
| Flag | singleSelect (OK / Clicks No Conversion / High CPA / Low CR / High Abandonment) | Automatische flag | `OK` |
| Notes | longText | Handmatige observaties Nathan | — |

### Views Conversion Tracking
- **Today**: `Date = TODAY()`, sorted by Revenue desc
- **Last 7 days**: `Date > TODAY() - 7`, gegroepeerd per Product
- **Flagged**: `Flag != OK`, sorted by Date desc
- **Hero product focus**: `Product = Ongebleekt 3L 48`, last 30 days

---

## Table 9: AB Tests

Lopende en afgeronde A/B tests op page copy, hero elementen, pricing frames.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| Test ID | singleLineText (primary) | Unieke test naam | `AB-2026-04-hero-3L48` |
| Test Name | singleLineText | Leesbare naam | `Hero copy 3L 48 — waarde vs comfort` |
| Page/Element | singleLineText | Welke pagina + element | `/products/ongebleekt-3-laags-48 — hero headline` |
| Variant A Description | longText | Beschrijving baseline | `Huidige hero: "Ongebleekt bamboe toiletpapier 48 rollen"` |
| Variant B Description | longText | Beschrijving variant | `Waarde-eerst hero: "48 rollen = ~100 normale rollen. Geen bomen. Langer doen."` |
| Product | singleSelect (Ongebleekt 2L 24 / 2L 48 / 2L 96 / Ongebleekt 3L 24 / 3L 48 / 3L 96 / Blanc 3L 24 / 3L 48 / 3L 96) | Welk product | `Ongebleekt 3L 48` |
| Status | singleSelect (Draft / Running / Winner Declared / Archived) | Huidige staat | `Running` |
| Start Date | date | Start van test | 2026-04-10 |
| End Date | date | Einde (of verwachte einde) | 2026-04-20 |
| Variant A Sessions | number | Aantal sessies baseline | 412 |
| Variant A Conversions | number | Orders van baseline | 18 |
| Variant A CR | formula (`{Variant A Conversions} / {Variant A Sessions}`) | Conversion rate baseline | 0.0437 |
| Variant B Sessions | number | Aantal sessies variant | 398 |
| Variant B Conversions | number | Orders van variant | 27 |
| Variant B CR | formula (`{Variant B Conversions} / {Variant B Sessions}`) | Conversion rate variant | 0.0678 |
| Winner | singleSelect (A / B / Inconclusive) | Wie wint | `B` |
| Lift (%) | number | Procentuele lift van winnaar t.o.v. loser | 55.3 |
| Notes | longText | Observaties | `B wint met duidelijk verschil, waarde-framing converteert beter dan productnaam` |

### Views AB Tests
- **Running**: `Status = Running`, sorted by Start Date desc
- **Winners last 30 days**: `Status = Winner Declared`, Date > TODAY() - 30
- **Drafts**: `Status = Draft`
- **Archive**: `Status = Archived`

---

## Table 10: Page Variants

Alle page copy varianten — draft, in-test, winnaar, archief. Bron voor `/page-optimizer` en `/ab-test-manager`.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| Variant ID | singleLineText (primary) | Unieke ID | `PV-2026-04-3L48-hero-v2` |
| Product | singleSelect (Ongebleekt 2L 24 / 2L 48 / 2L 96 / Ongebleekt 3L 24 / 3L 48 / 3L 96 / Blanc 3L 24 / 3L 48 / 3L 96 / Overig) | Welk product | `Ongebleekt 3L 48` |
| Page Type | singleSelect (Product Page / Landing Page / Collection Page / Cart Page / Home / FAQ) | Welk page type | `Product Page` |
| Element | singleSelect (Hero Copy / USP Order / Trust Block / Pricing Frame / Bundle Offer / CTA / Subline / FAQ Block) | Welk element | `Hero Copy` |
| Current Version | longText | Huidige live versie | `Ongebleekt bamboe toiletpapier 3 laags 48 rollen` |
| Proposed Version | longText | Nieuwe variant in Bamboo voice | `48 rollen ≈ 100 normale rollen. Ongebleekt bamboe, 3 laags comfort. Geen bomen, plasticvrij verpakt.` |
| Status | singleSelect (Draft / In AB Test / Winner / Archived) | Huidige staat | `Draft` |
| AB Test | multipleRecordLinks (→ AB Tests) | Gekoppelde test | `AB-2026-04-hero-3L48` |
| Created Date | createdTime | Aanmaakmoment | 2026-04-13 |
| Reasoning | longText | Waarom deze variant (welke USP-volgorde, welke trust elementen) | `Waarde-eerst (100 normale rollen), dan comfort (3 laags), dan duurzaamheid (geen bomen). 2-van-3 regel: waarde + geen bomen.` |
| Two Of Three Check | singleSelect (OK / Fail) | Haalt 2-van-3 regel | `OK` |
| Activist Check | singleSelect (Clean / Rewrite Needed) | Activist-taal detectie | `Clean` |

### Views Page Variants
- **Drafts wachten op review**: `Status = Draft`, sorted by Created Date desc
- **In AB Test**: `Status = In AB Test`
- **Winners ready to ship**: `Status = Winner`
- **Archive**: `Status = Archived`
- **Hero product**: `Product = Ongebleekt 3L 48`

---

## Pre-fill bij installatie

Bij eerste setup van de base: voeg 1 voorbeeldrij toe in elke tabel zodat Nathan ziet hoe het werkt. Deze rijen worden gemarkeerd met `Notes: "Voorbeeld — verwijder na eerste echte data"`.

---

## Relaties tussen tabellen

```
Campaigns (Systeem 3)
    ↓ linked via Campaign ID
Conversion Tracking (Systeem 4, Table 8)

AB Tests (Table 9) ←→ Page Variants (Table 10)
    (AB Tests.Variants linkt naar Page Variants.AB Test)
```

Dit houdt het spoor compleet: ad spend uit Systeem 3 → clicks → sessies → orders → conversie → welke page variant leverde dat op.
