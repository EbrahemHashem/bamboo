# Systeem 4 — Conversion Engine

## Wat dit systeem doet
Sluit de loop van ad → klik → aankoop. Waar Systeem 3 stopt bij klikken en spend, pakt Systeem 4 het vanaf het moment dat iemand op de Shopify webshop landt. Het systeem meet de conversie per product/kanaal/campagne, detecteert pagina's die klikken krijgen maar niet converteren, draait A/B tests op page copy, stelt pricing frames en bundels voor, en schrijft checkout- en upsell-copy in Bamboo voice.

**Brand brain:** dezelfde bronnen als Systeem 2 en 3 — `CLAUDE.md`, `brand-voice.md`, `products.md`, plus de lokale `conversion-guardrails.md`.

**Missie van dit systeem**: Nathan schaalt van €5-6k naar €50-60k per maand. Meer ads werkt alleen als de webshop mee schaalt. Dit systeem zorgt dat elke euro ad spend in Systeem 3 niet lekt op de productpagina of in de checkout.

---

## Hoe Nathan het gebruikt

### Dagelijkse conversie check
```
/conversion-analyst
```
Output:
- Conversie per product (hero 3L 48 altijd bovenaan)
- Conversie per kanaal (Meta Ads / Organic IG / Bol.com / Direct / B2B)
- "Clicks No Conversion" alert — campagnes met >50 clicks en 0 orders laatste 24u
- CPA en ROAS per campagne (gekoppeld aan Systeem 3 Ad Variants)
- Concrete acties: welke pagina fixen, welke campagne pauzeren

### Page copy optimaliseren
```
/page-optimizer "product page hero copy voor Ongebleekt 3L 48 rollen"
```
Output:
- Huidige versie (baseline uit Shopify)
- Verbeterde versie in Bamboo voice (2-van-3 regel, waarde-eerst, geen activist-taal)
- Reasoning: welke USP-volgorde, welke trust elementen, welke CTA
- Automatisch opgeslagen als Draft in `Page Variants` Airtable tabel

### Pricing & bundles
```
/pricing-strategist
```
Output:
- Bundelvoorstellen (24 → 48 upgrade, 48 + handdoeken, B2B 96 subscription)
- Waarde-per-gebruik framing in plaats van prijs-per-doos
- Marge impact per bundel (30% baseline)
- Ready-to-upload specs

### A/B test management
```
/ab-test-manager
```
Interactief menu:
- `create` — nieuwe test aanmaken (baseline + variant, min 1 element)
- `list active` — alle draaiende tests
- `declare winner` — handmatig winnaar kiezen (als n8n geen significantie vindt)
- `archive` — afgeronde tests opbergen

### Store page audit
```
/store-page-audit "https://bamboodisposables.nl/products/ongebleekt-3-laags-48"
```
Output: grade A-F + specifieke fixes op USP-volgorde, trust blok, CTA zichtbaarheid, mobile copy, activist-taal detectie, 2-van-3 regel.

### Checkout copy
```
/checkout-optimizer
```
Genereert cart page copy, shipping transparency, post-purchase upsell (48 → 96 reorder reminder), FAQ in cart.

### Bundel creator
```
/bundle-creator "proefpakket voor nieuwe klanten"
```
Volledige bundel spec: naam, subline, 3 bullets, prijs, marge, perceived savings, CTA — klaar om te uploaden naar Shopify.

### Automatische monitoring (draait op n8n)
- **Elke 6 uur** (`bamboo-conversion-monitor`): Shopify orders laatste 24u pullen, matchen met ad spend uit Systeem 3, conversion rate berekenen per campagne, flaggen als "clicks maar geen conversie"
- **Dagelijks 22:00** (`bamboo-ab-test-evaluator`): draaiende A/B tests evalueren, significantie checken (>100 sessies per variant + >10% lift), automatisch winnaar declareren, Nathan pingen

---

## Technische setup

### MCP servers
- **Shopify** (Custom App Admin API token — zie `shopify-setup.md`)
- **Airtable** (zelfde base als Systeem 1 en 3: "Bamboo Ad Research")

### Airtable tabellen (Tabel 8, 9, 10 — bovenop Systeem 1 en 3)
1. **Conversion Tracking** — sessies, orders, revenue, CPA, ROAS per dag per campagne
2. **AB Tests** — lopende en afgeronde tests met significantie + winner
3. **Page Variants** — alle page copy varianten (draft, in-test, winner, archived)

Volledig schema in `airtable-schema-conversion.md`.

### Skills die dit systeem gebruikt
- `/conversion-analyst` — dagelijkse conversie rapportage + "clicks no conversion" flag
- `/page-optimizer` — page copy varianten genereren in Bamboo voice
- `/pricing-strategist` — bundel- en pricing-frames berekenen
- `/ab-test-manager` — A/B tests aanmaken, listen, winnaar declareren
- `/store-page-audit` — volledige page audit met grade + fixes
- `/checkout-optimizer` — cart + checkout + upsell copy
- `/bundle-creator` — ready-to-upload bundel specs

### n8n workflows
- `bamboo-conversion-monitor.json` — elke 6 uur, Shopify ↔ Airtable sync + flag
- `bamboo-ab-test-evaluator.json` — dagelijks 22:00, significantie + auto-winner

---

## Environment variables

```bash
SHOPIFY_ACCESS_TOKEN=shpat_xxx        # Custom App Admin API token
SHOPIFY_STORE_URL=bamboodisposables.myshopify.com
AIRTABLE_API_KEY=pat_xxx
AIRTABLE_BASE_ID=appXXX               # zelfde als Systeem 1 en 3
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

Shopify token genereren: volg `shopify-setup.md` stap voor stap.

---

## Veiligheidsregels

1. **Page Variants starten ALTIJD als Draft** — Nathan moet live zetten
2. **A/B test auto-winner alleen bij significantie** — >100 sessies per variant EN >10% lift
3. **Geen prijs-verlaging zonder approval** — pricing-strategist stelt voor, Nathan beslist
4. **Activist-taal check op ALLE gegenereerde copy** — zelfde guardrails als Systeem 2
5. **2-van-3 regel hard** — elke gegenereerde variant die deze regel faalt wordt herschreven, niet opgeslagen

---

## Connection to other systems

- **Systeem 1 (Competitor Scraping)**: hooks en angles die hoog scoren in Systeem 1 → input voor `/page-optimizer` als referentie
- **Systeem 2 (Content Machine)**: visuals die Systeem 2 produceert → gebruikt in page hero en bundel mockups
- **Systeem 3 (Ad Management)**: Campaigns en Ad Variants tabellen leveren spend en clicks per campagne → gekoppeld in `Conversion Tracking` tabel voor ROAS/CPA per campagne
- **Feedback loop**: als `/conversion-analyst` detecteert dat een campagne veel klikken maar 0 conversies heeft, triggert het Systeem 3 om de ad te pauzeren OF stuurt de ad naar `/page-optimizer` voor paginafix — afhankelijk van de root cause (ad belooft iets anders dan de pagina levert, of pagina conversion rate is structureel laag)

---

## Verificatie na installatie

1. `/conversion-analyst` → draait zonder errors, toont laatste 24u data uit Shopify en Airtable
2. Shopify MCP connected: test met `/store-page-audit "https://bamboodisposables.nl/products/ongebleekt-3-laags-48"` → haalt live page content op
3. Airtable `Conversion Tracking`, `AB Tests`, `Page Variants` tabellen bestaan en hebben correct schema (zie `airtable-schema-conversion.md`)
4. `bamboo-conversion-monitor.json` geïmporteerd in n8n, test-run lukt zonder errors
5. `/page-optimizer "test hero copy Ongebleekt 3L 48"` → genereert baseline + verbeterde variant, schrijft weg naar `Page Variants` als Draft, geen activist-taal, haalt 2-van-3 regel

---

## Bamboo-specifieke conversie regels

Zie `conversion-guardrails.md` voor de volledige set. Samenvatting:

- **Taal**: Nederlands, "je/jij", nooit "u"
- **Geen activist-taal**: trigger woorden zijn redd(en), planeet, onze kinderen, toekomst van, verantwoordelijkheid, maak statement, schreeuwen om
- **2-van-3 regel**: elke copy-variant raakt minimaal 2 van: meer gebruikswaarde / minder verspilling / geen bomen
- **Waarde-eerst**: altijd waarde per gebruik, nooit prijs per doos
- **Hero positie**: Ongebleekt 3 laags 48 rollen krijgt altijd de sterkste slot op landing + home
- **Trust volgorde**: gebruikswaarde → comfort → duurzaamheid (nooit andersom)
- **CTA stijl**: direct, kort, geen hype ("Bestel nu", "Kies jouw pakket", "Start met proberen")
