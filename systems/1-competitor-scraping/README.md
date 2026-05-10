# Systeem 1 — Competitor Scraping

## Wat dit systeem doet
Elke dag om 07:00 NL tijd scrapet dit systeem automatisch de Meta Ad Library (+ IG + TikTok optioneel) voor de 4 Bamboo concurrenten. Alle nieuwe ads worden opgeslagen, geclassificeerd (hook/angle/format) en Nathan krijgt een notificatie + wekelijks digest.

**Concurrenten** (zie `~/projects/mac-mini-builds/bamboo/competitors.json`):
- The Good Roll
- Bamboi
- The Cheeky Panda
- Who Gives A Crap

---

## Hoe Nathan het gebruikt

### Automatisch (standaard)
Doet zichzelf. Dagelijks 07:00 → scrape → Airtable → Telegram ping → maandag 09:00 wekelijkse digest naar email.

### Handmatig — ad hoc vraag
```
/scrape-ads The Good Roll
```
Of voor analyse:
```
/competitor-analyst "wat werkt deze week bij onze 4 concurrenten?"
```
Of een diepere research run voor 1 concurrent:
```
/competitor-research The Cheeky Panda
```

### Vragen aan het systeem
```
Welke hook-angles werken nu het beste bij onze 4 concurrenten?
Welke formats (static/video/carousel) draaien het langst?
Wat doet Who Gives A Crap deze maand met Black Friday?
Welke winners draaien al >30 dagen bij The Good Roll?
```

---

## Technische setup

### Airtable base (Nathan moet eenmalig opzetten)
Base naam: **Bamboo Ad Research**

Tables:
1. **Competitors** — 4 rows (pre-fill uit competitors.json). Velden: Name, Facebook Page ID, Status, Live Ads Count, Priority.
2. **Ad Research** — alle gescrapete ads. Velden zie `_modules/skills/scrape-ads.md` schema (Ad Archive ID, Page Name, Start Date, Display Format, Angle Category, Hook, Is Winner, etc.)
3. **Weekly Digest** — samengestelde rapporten per week.

### MCP servers nodig
- **Airtable** (voor data opslag) — token in `.mcp.json`
- **Apify** (voor Meta Ad Library scraping) — token in `.mcp.json`

### Skills die dit systeem gebruikt
Alle skills draaien vanuit `~/.claude/commands/` (via install script):
- `/scrape-ads` — hoofd-pipeline (scrape + transcribe + classify)
- `/competitor-research` — diepere research per concurrent
- `/competitor-analyst` — 7 analyses genereren uit Airtable data
- `/scan-competitors` — quick status check

### n8n workflow
Zie `bamboo-competitor-daily-scrape.json` in deze folder. Importeer in n8n, stel env vars in, activeer cron.

---

## Environment variables (via install script)

```bash
AIRTABLE_API_KEY=pat_xxx
AIRTABLE_BASE_ID=appXXX
APIFY_API_TOKEN=apify_api_xxx
TELEGRAM_BOT_TOKEN=xxx   # voor daily ping
TELEGRAM_CHAT_ID=xxx
NATHAN_EMAIL=nathan@bamboodisposables.nl  # voor weekly digest
```

---

## Verificatie na installatie

1. `/scrape-ads The Good Roll` — draait zonder error, vult Airtable Ad Research tabel
2. Airtable `Competitors` tabel heeft 4 rows met correcte Page IDs
3. n8n workflow import lukt en heeft groene status (paused of actief)
4. Test-run: handmatig n8n workflow triggeren → Nathan krijgt Telegram ping
5. `/competitor-analyst "weekly overview"` → genereert rapport zonder error

---

## Weekly digest format (wat Nathan krijgt in mail)

Elke maandag 09:00:

> **Bamboo Competitor Digest — Week XX**
>
> **🏆 Winners this week** (ads live >7 dagen + hoge impressions)
> - [Concurrent] [Hook] [Angle] [Format] [Days live]
>
> **🆕 New launches** (nieuwe ads in laatste 7 dagen)
> - [Concurrent] [Hook] [Format]
>
> **📈 Format trends**
> - Video: X% / Static: Y% / Carousel: Z%
>
> **🎯 Angles trending**
> - Waarde: X ads / Comfort: Y ads / Duurzaam: Z ads
>
> **💡 Bamboo action items** (AI suggesties)
> - Test hook "X" in ons slim-niet-activist frame
> - [Concurrent] gebruikt format Y — recreate in Bamboo voice
