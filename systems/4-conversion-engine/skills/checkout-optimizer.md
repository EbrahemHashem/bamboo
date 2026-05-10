---
name: checkout-optimizer
description: Schrijft Bamboo checkout en post-purchase copy — cart page, shipping transparency, FAQ in cart, post-purchase upsell (48 → 96 reorder), return/guarantee copy. Alles in Bamboo voice, nuchter, geen hype.
---

# /checkout-optimizer — Bamboo Checkout & Post-Purchase Copy

Je schrijft copy voor de checkout-flow en post-purchase momenten op de Bamboo Shopify webshop. Waar Systeem 4 andere skills de top-of-funnel pagina's (hero, productpagina) optimaliseren, werk jij aan de bottom-of-funnel: cart → shipping → confirmatie → reorder reminder.

## Context files die je eerst leest

1. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/CLAUDE.md`
2. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/brand-voice.md`
3. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/products.md` — voor upsell routes (24→48, 48→96)
4. `/Users/yellehwerker/projects/mac-mini-builds/bamboo/systems/4-conversion-engine/conversion-guardrails.md`

## Wat dit skill genereert (in volgorde van impact)

### 1. Cart page copy
Boven de line items of als sidebar:
- **Mini-reassurance blok**: 3 korte reminders waarom deze aankoop slim is (waarde per gebruik, geen bomen, voorraadrust)
- **Shipping signaal**: "Gratis verzending vanaf €X" of duidelijke shipping policy met verwachte levertijd
- **Return/guarantee**: simpele return policy in 1 zin — nuchter, geen kleine lettertjes gevoel

### 2. Shipping / checkout step copy
Op de shipping page van Shopify checkout:
- **Levertijd expectation**: concreet — "Besteld voor 15:00 = morgen in huis" (als dit klopt)
- **Verzendkosten transparency**: geen verrassingen — als er een drempel is, die vóór de shipping step al communiceren
- **Perkedocumenten**: wat krijgt de klant bij de doos (factuur, QR voor volgende bestelling, FAQ kaart?)

### 3. FAQ in cart / checkout
3-5 korte FAQs die friction wegnemen, in volgorde:
1. "Hoelang gaan 48 rollen mee in een huishouden?" → concreet antwoord met waarde-frame
2. "Werkt het goed in septic / oude leidingen?" → "ja, oplosbaar en geurvrij"
3. "Wat als ik te veel heb besteld?" → return policy simpel
4. "Kan ik later herhalen zonder opnieuw te bestellen?" → subscription/herhaal teaser
5. (optioneel) "Waarom bamboe in plaats van gerecycled papier?" → nuchter antwoord, geen preek

### 4. Order confirmation email (eerste follow-up)
Direct na aankoop:
- Bevestigingstoon: nuchter, warm, geen "Je hebt een statement gemaakt!"
- Wat gebeurt er nu: verzending, track & trace
- **Zachte cross-sell**: "Volgende keer ook 96 rollen proberen? Minder bestelmomenten, zelfde comfort." — niet opdringerig

### 5. Post-purchase upsell (48 → 96 reorder reminder)
Timing: 6-8 weken na eerste 48-rollen aankoop (ongeveer wanneer voorraad slinkt). Via email of SMS.
- **Subject**: "Nog rollen over?" of "Je voorraad slinkt — tijd voor de 96"
- **Body**:
  - Erkenning: "Het is alweer een paar weken sinds je laatste bestelling"
  - Upgrade frame: 96 rollen ≈ 200 normale rollen — "weken minder bestelmomenten"
  - Bonus: als mogelijk een kleine perceived savings ("bij 96 rollen kost elk vel {X} minder")
  - CTA: "Upgrade naar 96 rollen"
  - Alternatief CTA: "Herhaal mijn 48 rollen" (geen dwang naar upgrade)

### 6. Subscription offer copy (B2B en consument)
Voor 96 rollen varianten en B2B:
- **Frame**: "Vaste levering per maand / 2 maanden / 3 maanden — minder handmatig bestellen"
- **Opt-in laag**: eerste maand zonder commitment, pas daarna recurring
- **Pause/cancel**: duidelijk dat het altijd kan — maakt de drempel lager
- **Waarde-frame**: "Nooit meer zonder papier zitten" + "weken voorraad per levering"

## Stap-voor-stap proces

### Stap 1 — Input parsen
Nathan kan specifiek vragen: `/checkout-optimizer cart page`, `/checkout-optimizer post-purchase upsell`, of leeg laten → genereer alle 6 blokken.

### Stap 2 — Huidige staat checken (optioneel)
Als Nathan URL geeft of zegt "baseline uit live store" → Shopify MCP call om bestaande checkout settings / email templates te pullen. Anders: genereer vanuit 0.

### Stap 3 — Copy schrijven in Bamboo voice
Volg alle guardrails uit conversion-guardrails.md. Voor elke blok:
- Check 2-van-3 regel
- Check activist-taal
- Waarde-eerst framing
- CTA stijl (direct, kort, geen hype)

### Stap 4 — Output in Airtable opslaan
Als Nathan wil: schrijf per blok een rij naar Page Variants (Table 10):
- `Page Type`: `Cart Page` / `Landing Page` (voor email deze als note in Notes field)
- `Element`: `Hero Copy` / `Trust Block` / `CTA` / `FAQ Block`
- `Status`: `Draft`

## Output voorbeelden (Bamboo voice)

### Cart mini-reassurance
```
Goede keuze.
48 rollen = weken voorraad in één bestelling.
Geen bomen, plasticvrij verpakt, oplosbaar.
Besteld voor 15:00 = morgen in huis.
```

### Post-purchase upsell subject lines
- ❌ "MIS DE UPGRADE NIET!" — hype
- ❌ "Doe iets goeds voor de planeet met 96 rollen" — activist
- ✅ "Je rollen slinken. Tijd voor 96?"
- ✅ "Minder bestellen, zelfde comfort"
- ✅ "200 normale rollen in één doos — de upgrade"

### Return policy (1 zin versie)
```
Niet tevreden? Stuur terug binnen 30 dagen — ongeopend of geopend, zelfde adres, geld retour.
```

## Brand guardrails

- Nederlands, "je/jij"
- Geen moreel pricing ("maak een verschil", "stemmen met je portemonnee")
- Geen overdreven dankjes ("heel erg bedankt dat je voor ons kiest!!") — nuchter bevestigen is genoeg
- Geen opdringerige upsell — eerste bestelling is winst, upsell is bonus
- Geen scarcity fake ("nog maar X op voorraad!") tenzij écht waar
- Subscription-taal is rustig: "makkelijke vaste levering", niet "verbind je aan onze beweging"

## Output format

```markdown
# Checkout & Post-Purchase Copy — {datum}

## 1. Cart page
[copy blok]

## 2. Shipping step
[copy blok]

## 3. FAQ in cart
[5 Q&A]

## 4. Order confirmation email
**Subject**: ...
**Body**: ...

## 5. Post-purchase upsell (48 → 96)
**Timing**: 6-8 weken na aankoop
**Subject**: ...
**Body**: ...
**CTA**: ...

## 6. Subscription offer
[copy blok]

## Checks
- Two-of-three: OK op alle blokken
- Activist: Clean
- Waarde-eerst: ja
- Geen hype: ja
```
