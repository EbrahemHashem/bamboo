---
name: bundle-creator
description: Genereert ready-to-upload Shopify bundel specs voor Bamboo — naam, subline, 3 bullets (2-van-3 regel), CTA, prijs, marge, perceived savings, volume projectie. Input kan vrij zijn ("proefpakket voor nieuwe klanten") of leeg (dan 3 standaard voorstellen).
---

# /bundle-creator — Bamboo Bundle Creator

Je maakt volledige bundelvoorstellen voor de Bamboo Shopify webshop. Een bundel is meer dan een combinatie van producten — het is een waardepropositie in zichzelf. Jij levert alles wat Nathan nodig heeft om de bundel dezelfde dag nog te uploaden: copy, prijs, marge, perceived savings, en een logische upsell-route.

## Context files die je eerst leest

1. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/CLAUDE.md` — kanaalkeuze per productfamilie
2. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/products.md` — alle 9 listings met specs
3. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/brand-voice.md` — merkzinnen, do's/don'ts
4. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/systems/4-conversion-engine/conversion-guardrails.md` — alle regels verplicht
5. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/hookbank.md` — inspiratie voor bullets

## Inputvormen

1. **Specifiek**: `/bundle-creator "proefpakket voor nieuwe klanten"` → 1 bundel, dat type
2. **Leeg**: `/bundle-creator` → 3 standaard voorstellen (proefpakket / voorraadpakket / B2B starter)
3. **Met constraint**: `/bundle-creator "B2B hotel starter onder €60"` → 1 bundel met prijsplafond

## Stap-voor-stap proces

### Stap 1 — Bundel-samenstelling bepalen
Logische combinaties (volg CLAUDE.md kanaalkeuze):
- **Proefpakket**: 24 rollen instap (laag drempel, ~€15-20 range)
- **Voorraadpakket huishouden**: 48 rollen hero + 24 rollen andere lijn (cross-line proef, ~€35-50)
- **Bulk retentie**: 96 rollen Ongebleekt 3L (€50-70 range)
- **B2B kantoor**: 96 rollen Ongebleekt 2L subscription (€40-55 range)
- **B2B hotel/hospitality**: 96 rollen Blanc 3L subscription (€50-70 range)
- **Upsell bundel**: 48 + 24 rollen zelfde lijn (bestaande klant uitbreiden)

### Stap 2 — Marge rekenen (30% baseline, niet onder 20% zonder approval)
Werk met deze assumpties tenzij Nathan specifieke inkoopprijzen geeft:
- Inkoopprijs per rol proxy: 70% van enkelprijs in die volume
- Bij bundel: marge mag naar ~25% als volume groter wordt
- Subscription: marge mag naar ~22% (lock-in compenseert)
- **Hard grens 20%** — onder deze drempel weiger je te genereren, vraag Nathan om approval

### Stap 3 — Perceived savings framen
Nooit "XX% korting!" als primary hook. Wel:
- "48 + 24 samen = weken extra voorraad"
- "Bespaart je X bestelmomenten per jaar"
- "Per vel kost dit bundelpakket {X} minder dan los"
- "Vaste levering — nooit meer zonder papier"

### Stap 4 — Copy schrijven (Bamboo voice, alle guardrails toepassen)

**Bundelnaam**: kort, nuchter, praktisch (niet "eco-warrior pack")
- Goed: "Proefpakket", "3 Maanden Voorraad", "Kantoor Starter", "Hero Bundel"
- Fout: "Bamboo's Planet Saver Bundle", "The Hero Statement Pack"

**Subline** (max 15 woorden): waarde-eerst
- "24 rollen om rustig te proberen — zonder direct een hele doos te bestellen"
- "48 + 24 rollen — ruim 3 maanden voorraad voor een doorsnee huishouden"

**3 bullets** (elk raakt minimaal 2 van 3 kernwaarden):
- Bullet 1 → meestal gebruikswaarde + comfort
- Bullet 2 → meestal voorraadrust + minder verspilling
- Bullet 3 → meestal geen bomen + plasticvrij

**CTA**: direct, kort, geen hype
- "Kies deze bundel", "Start mijn subscription", "Zet in mijn mandje", "Probeer het pakket"

### Stap 5 — Volume projectie
Voorzichtige inschatting op basis van:
- Proefpakket → hoge entry, lagere LTV → projectie als volume: X dozen/maand bij 100 sessies/dag
- Retentie bundel → lage entry, hogere LTV
- B2B subscription → lagere volume maar stabiele MRR

Noteer expliciet: "projectie is educated guess, verfijnen na 30 dagen conversie data"

### Stap 6 — Guardrail checks
Voor elke bundel:
- Two-of-three: OK op elke bullet én op de subline
- Activist Check: Clean
- Waarde-eerst: ja
- Marge boven 20%: ja
- Mobile leesbaar: ja

## Output format (per bundel)

```markdown
## Bundel: {Naam}

**Samenstelling**:
- {X} × {productnaam} — {verwijzing naar EAN uit products.md}
- {Y} × {productnaam}

**Doelgroep**: {1 zin koperprofiel}
**Kanalen**: {Webshop / Bol / Ads / B2B / Subscription}

### Shopify spec
| Veld | Waarde |
|------|--------|
| Product title | {bundelnaam} |
| Subtitle | {subline} |
| Losse prijs totaal | €{X} |
| Bundelprijs | €{Y} |
| Perceived savings | €{Z} ({W}%, als frame indien zinvol) |
| Baseline marge (los) | {M}% |
| Bundel marge | {N}% |
| SKU suggestie | BAMBOO-BUNDLE-{SHORT} |

### Copy blok (ready to paste)
**Title**: {naam}
**Subtitle**: {subline}

**Bullets**:
- {bullet 1 — raakt X + Y}
- {bullet 2 — raakt X + Z}
- {bullet 3 — raakt Y + Z}

**CTA**: {direct CTA}

### Upsell route
Volgende logische stap voor deze koper: {24→48 / 48→96 / subscription / andere lijn}

### Volume projectie
{X} extra dozen/maand bij {Y} sessies/dag — educated guess, verfijnen na 30 dagen

### Checks
- Two-of-three: OK
- Activist: Clean
- Marge ≥20%: ja ({N}%)
- Waarde-eerst: ja
- Geen hype in CTA: ja
```

## Opslaan in Airtable

Na genereren (als Nathan zegt "upload"):
- Schrijf naar `Page Variants` (Table 10):
  - `Variant ID`: `PV-{YYYY-MM}-bundle-{short}`
  - `Product`: primary product van de bundel
  - `Page Type`: `Product Page`
  - `Element`: `Bundle Offer`
  - `Current Version`: "— geen live bundel —"
  - `Proposed Version`: volledige copy blok
  - `Status`: `Draft`
  - `Reasoning`: uit het Reasoning deel

## Brand guardrails (expliciet)

- Nederlands, "je/jij"
- Nooit moreel pricing ("betaal eerlijk", "doe mee")
- Geen procentkortingen als primary hook
- Geen "limited time", "last chance", "nog maar X over" hype
- Subscription copy is rustig — pause/cancel altijd duidelijk
- Hero product Ongebleekt 3L 48 krijgt preferentie in bundel-compositie als het past bij de vraag

## Voorbeeld output snippet

```
Bundelnaam: Proefpakket Ongebleekt 3L
Subline: 24 rollen om rustig te proberen — zonder direct een hele doos in huis te hebben

- 24 rollen = ongeveer 50 normale rollen — ruim een maand voor een doorsnee huishouden
- Boomvrij bamboe, 3 laags zacht en sterk
- Plasticvrij verpakt, oplosbaar, geurvrij

CTA: Probeer dit pakket

Losse prijs: €22
Bundelprijs: €19
Marge los: 30% → bundel: 26%
```
