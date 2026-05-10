# Bamboo Disposables BV — Install Guide

Deze guide is voor Nathan. Volg de stappen op volgorde en je AI systeem draait in ~30 minuten.

---

## Wat je krijgt

**6 AI systemen in 4 engines** — een volledig AI Growth Operating System op je MacBook:

### 🎯 Acquisition Engine (systemen 1-3)
1. **Competitor Scraping** — elke dag 07:00 automatische scrape van The Good Roll, Bamboi, The Cheeky Panda en Who Gives A Crap. Wekelijkse digest in je mail.
2. **Content Machine** — 4K statics, carousels, video scripts, captions. Volledig in Bamboo voice. Wacht op jouw goedkeuring.
3. **Ad Management** — briefs, uploads, Meta Ads management. Auto pause/scale op ROAS.

### 💰 Conversion Engine (systeem 4)
4. **Shopify optimalisatie** — productpagina varianten, A/B tests, bundels, prijsstrategie, "clicks no conversion" alerts. Elke 6 uur monitor.

### 🔄 Revenue Engine (systeem 5)
5. **Retentie + B2B** — Klaviyo email/SMS flows (welkom, reorder, winback), B2B leadgen voor kantoren/scholen/wellness/hospitality, reply classifier, reorder automation op basis van verbruik.

### 🧠 Intelligence Engine (systeem 6)
6. **Centrale hersenlaag** — dagelijkse ochtendbrief op Telegram, wekelijks strategierapport in je mail, anomaly detector, HTML management dashboard.

**Plus:**
- 8-module videocursus om ermee te werken
- Installatie op jouw laptop (macOS)
- Support via WhatsApp tijdens onboarding

---

## Vereisten

- **MacBook of iMac** met macOS Ventura of nieuwer
- **Claude Pro abonnement** (€20/maand) — apart aan te schaffen op claude.ai
- **Internet** voor alle MCP verbindingen
- **Admin rechten** op je Mac voor installatie
- **Accounts** die je nodig hebt (Nathan zet deze zelf op):
  - Anthropic Claude (Pro tier)
  - Airtable (Pro tier aangeraden — 17 tabellen passen niet op free)
  - Apify (pay-as-you-go of starter plan)
  - Meta Business Suite + Developer App
  - **Shopify Custom App** (voor Conversion + Revenue engines) — zie `systems/4-conversion-engine/shopify-setup.md`
  - **Klaviyo** (voor email/SMS flows) — zie `systems/5-revenue-engine/klaviyo-setup.md`
  - Google Account (voor Drive)
  - Telegram (voor notificaties)

---

## Installatie (30 minuten)

### Stap 1: Unzip de package
Pak `bamboo-ai-system.zip` uit naar een tijdelijke map, bijv. `~/Downloads/bamboo-build/`.

### Stap 2: Run de installer
```bash
cd ~/Downloads/bamboo-build/bamboo/install
bash install.sh
```
Het script vraagt één keer om Docker (optioneel). Rest draait automatisch. Duur: ~15 min.

### Stap 3: Log in bij Claude Code
```bash
claude login
```
Volg de browser login flow.

### Stap 4: Vul je API keys in
Open `~/Bamboo/.env` in een editor en vul elke `PLAK_JE_KEY_HIER` in met je echte keys.

**Waar vind je wat?**
| Key | Waar vandaan |
|-----|--------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `AIRTABLE_API_KEY` | airtable.com/create/tokens |
| `AIRTABLE_BASE_ID` | url van je base (appXXX) |
| `APIFY_API_TOKEN` | console.apify.com → Settings → API & Integrations |
| `META_*` | zie `~/Bamboo/systems/3-ad-management/meta-ads-setup.md` |
| `GEMINI_API_KEY` | makersuite.google.com → Get API key |
| `TELEGRAM_BOT_TOKEN` | @BotFather in Telegram |
| `TELEGRAM_CHAT_ID` | @userinfobot in Telegram |

### Stap 5: Airtable base opzetten
1. Log in op airtable.com
2. Create new base → "Bamboo Ad Research"
3. Volg `~/Bamboo/systems/1-competitor-scraping/airtable-schema.md` voor de tabellen
4. En `~/Bamboo/systems/3-ad-management/airtable-schema-ads.md` voor de extra ad tabellen
5. Copy de Base ID uit de URL (`appXXXXXX`) naar je `.env`

### Stap 6: Test run
Open Claude Code in je Bamboo folder:
```bash
cd ~/Bamboo && claude
```

Test commandos (1 voor 1):
```
/scrape-ads The Good Roll
```
Moet zonder errors draaien en Airtable Ad Research vullen.

```
/content-ideator "Ongebleekt 3 laags 48 rollen, waarde angle"
```
Moet 5 content concepten genereren in nuchter Nederlands.

```
/ad-brief "test brief Ongebleekt 3L comfort angle"
```
Moet volledige ad brief opleveren.

Als een van deze 3 faalt → WhatsApp Leon, we fixen het samen.

### Stap 7: n8n workflows importeren (11 totaal)
Open n8n (lokaal op http://localhost:5678 of je n8n.cloud account) en importeer alle workflows uit `~/n8n-workflows/bamboo/`:

**Acquisition:**
- `bamboo-competitor-daily-scrape.json` (dagelijks 07:00)
- `bamboo-weekly-digest.json` (maandag 09:00)
- `bamboo-ad-performance-loop.json` (elke 4 uur)

**Conversion (Systeem 4):**
- `bamboo-conversion-monitor.json` (elke 6 uur)
- `bamboo-ab-test-evaluator.json` (dagelijks 22:00)

**Revenue (Systeem 5):**
- `bamboo-retention-flow-monitor.json` (dagelijks 08:00)
- `bamboo-b2b-pipeline.json` (09:00 + 15:00)
- `bamboo-reorder-trigger.json` (dagelijks 10:00)

**Intelligence (Systeem 6):**
- `bamboo-daily-intelligence.json` (dagelijks 07:30)
- `bamboo-weekly-strategy-report.json` (maandag 10:00)
- `bamboo-anomaly-detector.json` (elke 4 uur)

Stel env vars in (zelfde als `.env`). Activeer de workflows. Test eerst met "Execute Workflow" voor je ze op cron zet.

### Stap 8: Dashboard openen
```bash
open ~/Bamboo/systems/6-intelligence-engine/dashboard.html
```
Eerste keer vraagt het naar je Airtable credentials — die worden lokaal opgeslagen in je browser. Daarna zie je live KPIs van alle engines.

### Stap 9: Klaar!
Je systeem draait. Welcome call met Leon voor de videocursus walkthrough.

---

## Dagelijks gebruik

### Open Claude Code in je Bamboo folder
```bash
cd ~/Bamboo && claude
```

### Vraag iets
```
Welke hook-angles werkten deze week bij mijn concurrenten?
Genereer 5 statics voor Ongebleekt 3L 48 rollen waarde-angle.
Maak een ad brief voor Blanc 3L cold traffic vrouwen 30-55.
Hoe doen mijn lopende ads het?
```

### Laat het systeem werken
- Dagelijks 07:00 → scrape draait automatisch → ping in Telegram
- Maandag 09:00 → wekelijkse digest in je mail
- Elke 4 uur → ad performance check → auto pause/scale als nodig

---

## Troubleshooting

### "claude command not found"
Herstart je terminal. Check met `which claude`. Als nog niet werkt: `npm install -g @anthropic-ai/claude-code`.

### Airtable MCP faalt
Check of je PAT token de juiste scopes heeft: `data.records:read`, `data.records:write`, `schema.bases:read`.

### Meta Ads token verlopen
Tokens zijn 60 dagen geldig. Volg `meta-ads-setup.md` om nieuwe te genereren. Systeem waarschuwt je 7 dagen van tevoren.

### n8n workflow faalt
Check eerst of alle env vars ingevuld zijn in n8n (niet alleen in `.env`). Test met "Execute Workflow" voor productie-activatie.

### Content klinkt te activistisch
Check `~/Bamboo/systems/2-content-machine/activist-guardrail.md` — als de guardrail niet triggert is er iets mis met brand-voice.md loading. WhatsApp Leon.

---

## Wat niet in deze build zit

De volgende dingen zitten **NIET** in de €5.500 build:

- Het herschrijven van je 9 Bol listings
- Het bouwen/redesign van je Shopify webshop
- Het uitvoeren van B2B sales / cold outreach
- Email flow opzetten in je klantsysteem
- 90-dagen implementatie consulting
- Homepage wireframes bouwen

Je AI systeem kan wel helpen om die dingen **te genereren** (bijvoorbeeld: "schrijf me 3 versies van een Bol listing voor de Ongebleekt 3L 48 rollen") — maar jij implementeert ze zelf.

Als je dat ook uitbesteed wil → aparte offerte, los van de build.

---

## Support

Tijdens onboarding en eerste 30 dagen: WhatsApp Leon direct.
Na 30 dagen: community support via Circle.

---

Succes! Geniet van je slimmer werkende toiletpapier machine 🎯
