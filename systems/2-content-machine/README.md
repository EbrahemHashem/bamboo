# Systeem 2 — Content Machine

## Wat dit systeem doet
Genereert on-merk content voor Bamboo: research → script/copy → 4K visual (nano banana) of carousel → caption. Alle output wacht op Nathan's goedkeuring voordat het live gaat.

**Brand brain:**
- `~/projects/mac-mini-builds/bamboo/CLAUDE.md` (master regels)
- `brand-voice.md` (tone, activist-guardrail)
- `avatar.md` (segmenten, jobs-to-be-done)
- `products.md` (9 listings, kernlijnen)
- `hookbank.md` (hooks per koopmotief)
- `creative-strategy.md` (funnel-laag principes)

---

## Hoe Nathan het gebruikt

### Daily content (automatisch, optioneel)
```
/daily-content-researcher
```
Output: 3-5 content ideeën op basis van (1) wat werkt bij concurrenten deze week (uit Systeem 1), (2) Bamboo hookbank, (3) seizoen/actualiteit.

### Content production (handmatig)
```
/content-ideator "statics voor Ongebleekt 3 laags 48 rollen, focus waarde-hook"
```
→ Genereert 5 idee-concepten met hook, angle, format, visual brief

```
/content-scripter "idee #3 uit vorige run, maak het 30sec UGC script"
```
→ Volledig script in Bamboo brand voice

```
/generate-ad-statics "Ongebleekt 3 laags hero ad, waarde angle, 4K static"
```
→ Nano banana 2 genereert 4K PNG + bewaart in Drive + Airtable row

```
/static-to-video "laatste static, 6 sec motion, zoom+pan"
```
→ Animeert static naar 6-sec ad video

```
/content-machine "full run: 5 statics + 3 carousels + 2 video scripts voor Ongebleekt 3L 48 rollen deze week"
```
→ Orchestreert alles: research → scripts → visuals → bestandsstructuur in Drive

### Carousel
```
/carousel-creator "10-slide carousel over 'Waarom 48 rollen slimmer is dan 9 rollen', voor Instagram"
```

### Content analyse (feedback loop)
```
/content-analyst "welke van m'n laatste 10 posts deden het best?"
```

---

## Brand guardrails (ingebouwd)

Elke content die dit systeem maakt moet door 3 checks:

1. **Nederlands check** — geen Engels tenzij Nathan vraagt
2. **Activist-check** — geen prekende/alarmerende taal. Trigger woorden in `brand-voice.md` worden gedetecteerd en triggeren herschrijving.
3. **2-van-3 regel** — elke uiting bevat minimaal 2 van: (a) meer gebruikswaarde (b) minder verspilling (c) geen bomen. Zo niet → herschrijven.

Zie `activist-guardrail.md` in deze folder voor de exacte implementatie.

---

## Default brand waarden voor visuals

Deze waarden worden automatisch in elke `/generate-ad-statics` en `/image-prompt-architect` call geïnjecteerd:

```yaml
brand: Bamboo Disposables BV
tone: nuchter, slim, premium-maar-niet-elitair
mood: volwassen, rustig, betrouwbaar
palette:
  primary: "#8B7355"  # warm bamboe bruin
  accent: "#F5F1E8"  # cream/off-white
  text: "#1A1A1A"    # near black
  highlight: "#4A7C3C" # nuchter natuurlijk groen (NIET fel)
typography: modern sans-serif, clean, geen fancy scripts
composition:
  - volwassen badkamer settings
  - rustige voorraadplank shots
  - product contrast (normaal vs bamboo rol)
  - unboxing close-ups
  - tekst-driven met concrete getallen
avoid:
  - fel groen "eco" kleuren
  - activist/protest beelden
  - huilende kinderen of zielige planeten
  - Engels copy
  - luxury lifestyle zweverigheid
```

---

## Technische setup

### MCP servers
- **Nano Banana 2** — 4K image generation (Gemini 3 Pro Image)
- **Supabase** — content database (of Airtable — zelfde systeem 1 base kan)
- **Google Drive** — asset opslag in georganiseerde folders

### Drive structuur
```
Bamboo/
  ├── 01-content-production/
  │   ├── 2026-04/
  │   │   ├── statics/
  │   │   ├── carousels/
  │   │   ├── video-scripts/
  │   │   └── captions/
  ├── 02-approved/    # Nathan keurt hier goed
  └── 03-posted/      # Archief na posten
```

### Skills die dit systeem gebruikt
- `/content-machine` — orchestrator
- `/content-ideator` — brainstorm module
- `/content-scripter` — scripts voor video/UGC
- `/daily-content-researcher` — dagelijkse research
- `/generate-ad-statics` — nano banana image gen
- `/static-to-video` — motion ads
- `/image-prompt-architect` — prompt engineering voor visuals
- `/carousel-creator` — multi-slide posts
- `/script-ads` — ad copy (werkt samen met Systeem 3)
- `/content-analyst` — performance feedback

---

## Environment variables

```bash
NANO_BANANA_API_KEY=xxx
GOOGLE_DRIVE_CREDS=xxx
AIRTABLE_API_KEY=pat_xxx    # kan delen met Systeem 1
AIRTABLE_BASE_ID=appXXX
ANTHROPIC_API_KEY=sk-ant-xxx
```

---

## Verificatie na installatie

1. `/content-ideator "Ongebleekt 3 laags waarde-hook"` → genereert 5 concepten in Bamboo voice
2. `/generate-ad-statics "hero product shot, waarde angle"` → levert 4K PNG in Drive
3. Test activist-guardrail: vraag expliciet om moralistische tekst → systeem weigert en herschrijft
4. Test 2-van-3 regel: vraag alleen een eco-claim zonder waarde → systeem voegt waardeanker toe
5. `/content-machine "full run 3 statics Ongebleekt 3L"` → draait end-to-end in <10 min
