---
name: store-page-audit
description: Audit van een Bamboo Shopify productpagina of landing page. Checkt USP-volgorde, trust blok, CTA zichtbaarheid, mobile copy, activist-taal detectie, 2-van-3 regel. Output is grade A-F + specifieke fixes.
---

# /store-page-audit — Bamboo Store Page Audit

Je audit een pagina op de Bamboo webshop (`bamboodisposables.nl` of `.myshopify.com`) tegen de Bamboo guardrails. Nathan krijgt een grade (A-F) en een lijstje concrete fixes in volgorde van impact.

## Context files die je eerst leest

1. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/CLAUDE.md`
2. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/brand-voice.md`
3. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/products.md`
4. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/systems/4-conversion-engine/conversion-guardrails.md` — alle 10 regels zijn checkpunten

## Input

Nathan geeft je een URL: `/store-page-audit "https://bamboodisposables.nl/products/ongebleekt-3-laags-48"`

## Stap-voor-stap proces

### Stap 1 — Pagina content ophalen
Via Shopify MCP:
- `GET /admin/api/2024-10/products.json?handle={handle}` voor product pages
- Of via web scrape van de live URL als het een custom landing is

Extract:
- Hero headline en subline
- Hero afbeelding(en)
- USP bullets / features
- Trust block (keurmerken, reviews, garanties)
- Pricing frame (hoe prijs gepresenteerd wordt)
- Product beschrijving
- CTAs (tekst + plaatsing)
- Mobile view (zo mogelijk)
- FAQ / extra blokken

### Stap 2 — 10 checks (elk punt met eigen score)

Score per check: ✅ OK / ⚠️ Aandachtspunt / ❌ Fail

1. **Taal** — Nederlands, "je/jij", geen "u", geen Engels (tenzij productterm)
2. **Geen activist-taal** — scan op trigger woorden (redd, planeet, onze kinderen, toekomst, verantwoordelijkheid, schreeuwen om, samen kunnen we)
3. **2-van-3 regel op hero** — raakt de hero copy minstens 2 van: gebruikswaarde / minder verspilling / geen bomen?
4. **Waarde-eerst framing** — staat "48 rollen ≈ 100 normale rollen" (of equivalent) boven de prijs?
5. **Hero product positie** — als dit Ongebleekt 3L 48 is, krijgt het visueel de sterkste slot?
6. **Trust volgorde** — gebruikswaarde → comfort → duurzaamheid → gezondheid, in deze volgorde van boven naar onder?
7. **CTA stijl** — direct, kort, zonder hype? Zichtbaar above the fold?
8. **Mobile leesbaarheid** — korte zinnen, max 2 regels per claim, hero headline ≤8 woorden?
9. **Geen overpromise op 2 laags** — niet "premium" of "luxe" claimen voor 2L lijn
10. **Blanc niet als "minder"** — positioneert het als brugproduct, niet als mindere keuze

### Stap 3 — Grade bepalen
- 9-10 ✅: **A** — loopt goed, alleen kleine tweaks
- 7-8 ✅: **B** — solide, 2-3 fixes
- 5-6 ✅: **C** — meerdere issues, prioriteer top 3 fixes
- 3-4 ✅: **D** — serieuze problemen, herzie hele pagina
- <3 ✅: **F** — pagina leakt conversies, volledige rewrite nodig

### Stap 4 — Concrete fixes in volgorde van impact
Voor elke ⚠️ of ❌ — schrijf een concrete fix:

```markdown
### Fix 1 (hoogste prio): {korte titel}
**Probleem**: {wat is er nu?}
**Waarom belangrijk**: {impact op conversie}
**Voorstel**: {concreet herschrijfvoorstel of structuurverandering}
**Moeite**: Laag / Middel / Hoog
```

## Output format

```markdown
# Audit: {page URL}
**Grade: {A-F}** ({N}/10 checks OK)

## Samenvatting
{1-2 zinnen over de algemene staat}

## Check-by-check
| # | Check | Score | Observatie |
|---|-------|-------|------------|
| 1 | Taal | ✅ | Nederlands, je/jij consistent |
| 2 | Geen activist-taal | ⚠️ | "Red mee" op bullet 3 |
| 3 | 2-van-3 op hero | ✅ | Raakt gebruikswaarde + geen bomen |
| 4 | Waarde-eerst | ❌ | Prijs staat boven waarde-frame |
...

## Top fixes in volgorde
### Fix 1 (hoogste prio): ...
### Fix 2: ...
### Fix 3: ...

## Wat werkt goed
- {punt}
- {punt}

## Volgende stap
{1 concrete next action — bv. "run /page-optimizer voor hero copy", "fix USP volgorde handmatig"}
```

## Brand guardrails voor het rapport zelf

- Nederlands, "je/jij"
- Nuchter, geen hype, geen overdreven kritiek
- Concreet — elke observatie met voorbeeld uit de pagina
- Praktisch — fixes moeten uitvoerbaar zijn

## MCP calls

- Shopify: `products.json?handle={handle}` of directe HTTP fetch van live URL
- Geen schrijfacties op de shop — dit is alleen read + rapport

## Fallback

- Als pagina niet bereikbaar is (404, auth fail) → noem dat, skip audit, suggereer dat Nathan Shopify token of URL checkt
- Als pagina leeg is (net aangemaakt) → noteer dat, geen grade, suggereer eerst content te schrijven via `/page-optimizer`
