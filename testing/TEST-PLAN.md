# Bamboo Build — Master Test & Debug Plan

**Voor:** Developer die de Bamboo build test en debugt voor delivery aan Nathan
**Doel:** End-to-end validatie van alle 3 systemen op een schone Mac, vóór we de zip naar Nathan sturen
**Geschatte tijd:** 4-6 uur eerste run, 1-2 uur per retest
**Sign-off:** `sign-off-checklist.md` — developer vult in en ondertekent vóór delivery

---

## Wat je test

Deze build bevat **3 AI systemen** voor Bamboo Disposables BV:
1. **Competitor Scraping** — Meta Ad Library scrape van 4 concurrenten, Airtable opslag, weekly digest
2. **Content Machine** — 4K statics, carousels, scripts met Bamboo brand voice + activist-guardrail
3. **Ad Management** — Meta Ads briefs, upload, auto pause/scale op ROAS

Plus install script, 6 MCP servers, 3 n8n workflows, 18 skills in `~/.claude/commands/`.

---

## Test omgeving vereisten

**Hardware:**
- Schone MacBook of Mac Mini (zo dicht mogelijk bij Nathan's setup)
- Minimaal 16GB RAM, 50GB vrije schijfruimte
- macOS Ventura of nieuwer

**Accounts (test-accounts, niet productie!):**
- Anthropic Claude Pro (of developer key met budget)
- Airtable (nieuwe lege workspace)
- Apify (free tier met $5 credit is genoeg voor test)
- Meta Developer + test Ad Account (gebruik een **sandbox** / test account, nooit Nathan's productie)
- Google Account voor Drive
- Telegram bot (nieuwe test bot via @BotFather)

**Waarschuwing:** Gebruik NOOIT Nathan's productie Meta Ads account of echte tokens tijdens test. Maak een test app en gebruik Meta's Ad Library sandbox waar mogelijk.

---

## Test volgorde (lineair, niet overslaan)

### Fase A: Pre-flight (30 min)
- [ ] 1. Clone / unzip build naar schone locatie
- [ ] 2. Verifieer folder structuur compleet (zie checklist)
- [ ] 3. Alle `.json` bestanden parsen zonder errors
- [ ] 4. Alle `.md` bestanden openen en renderen correct
- [ ] 5. `install.sh` heeft execute permissie

### Fase B: Install script (45 min)
- [ ] 6. Run `install.sh` op schone Mac
- [ ] 7. Valideer alle 13 stappen groen
- [ ] 8. Verifieer `~/Bamboo/` folder gevuld
- [ ] 9. Verifieer `~/.claude/commands/` bevat alle 18 skills
- [ ] 10. Verifieer `~/n8n-workflows/bamboo/` bevat 3 workflows

**SOP bij falen:** `sops/01-install-debug.md`

### Fase C: Claude Code + MCP setup (45 min)
- [ ] 11. `claude login` slaagt
- [ ] 12. `~/.claude/settings.local.json` wordt gevuld met test keys
- [ ] 13. `~/Bamboo/.env` wordt gevuld met test keys
- [ ] 14. `cd ~/Bamboo && claude` opent zonder errors
- [ ] 15. Binnen Claude Code: `/mcp` list toont alle 6 servers als "connected"

**SOP bij falen:** `sops/02-mcp-connection-debug.md`

### Fase D: Systeem 1 — Competitor Scraping (60 min)
- [ ] 16. Airtable test-base aangemaakt met 3 tabellen
- [ ] 17. Competitors tabel pre-filled met 4 rows
- [ ] 18. `/scrape-ads The Good Roll` draait zonder errors
- [ ] 19. Ad Research tabel vult met ≥5 rows
- [ ] 20. `/competitor-analyst "weekly overview"` genereert rapport
- [ ] 21. n8n workflow `bamboo-competitor-daily-scrape.json` importeert correct
- [ ] 22. Manual execute → Telegram ping komt aan
- [ ] 23. n8n workflow `bamboo-weekly-digest.json` draait → email met digest

**SOP bij falen:** `sops/03-airtable-debug.md`, `sops/04-apify-scraping-debug.md`, `sops/06-n8n-workflow-debug.md`

### Fase E: Systeem 2 — Content Machine (60 min)
- [ ] 24. `/content-ideator "Ongebleekt 3L 48 rollen waarde"` → 5 concepten in NL
- [ ] 25. Output is **nuchter** (geen activist taal)
- [ ] 26. **Activist-guardrail test**: vraag expliciet "maak een morele eco-pitch" → systeem herschrijft naar nuchter
- [ ] 27. **2-van-3 test**: vraag alleen een eco-claim → systeem voegt waarde toe
- [ ] 28. `/generate-ad-statics "Ongebleekt 3L hero shot"` → 4K PNG in Drive
- [ ] 29. `/static-to-video "laatste static, 6 sec"` → animatie output
- [ ] 30. `/content-machine "3 statics Ongebleekt 3L"` → orchestreert end-to-end
- [ ] 31. Alle output landt in `~/Bamboo/01-content-production/YYYY-MM/` (of Drive)

**SOP bij falen:** `sops/07-content-machine-debug.md`, `sops/08-activist-guardrail-debug.md`

### Fase F: Systeem 3 — Ad Management (60 min)
- [ ] 32. Meta Ads MCP connected: `/media-buyer-agent "status"` → live test account data
- [ ] 33. `/ad-brief "Ongebleekt 3L waarde angle cold NL"` → volledige brief in Bamboo voice
- [ ] 34. `/ad-machine "test campaign Ongebleekt 3L 3 variants"` → campagne structuur (DRY RUN, niet live)
- [ ] 35. Manual upload test: 1 test ad naar Meta Ads als PAUSED
- [ ] 36. n8n `bamboo-ad-performance-loop.json` importeert correct
- [ ] 37. Manual execute met test data → Airtable Decisions Log gevuld
- [ ] 38. Test pause-trigger: mock ROAS 1.0 + spend €25 → action = pause
- [ ] 39. Test scale-trigger: mock ROAS 3.5 + spend €50 → action = scale +20%
- [ ] 40. Test flag-trigger: mock CTR 0.3% + impressions 2000 → action = flag

**SOP bij falen:** `sops/05-meta-ads-debug.md`, `sops/09-ad-performance-loop-debug.md`

### Fase D2: Systeem 4 — Conversion Engine (45 min)
- [ ] Shopify MCP connected: `/conversion-analyst "laatste 7 dagen"` → live Shopify data
- [ ] Airtable heeft 3 nieuwe tabellen (Conversion Tracking, AB Tests, Page Variants)
- [ ] `/page-optimizer "Ongebleekt 3L hero copy"` → 2 varianten in Bamboo voice
- [ ] `/pricing-strategist` → bundels voor proef/upgrade/B2B
- [ ] `/store-page-audit` → audit rapport met 2-van-3 check
- [ ] n8n `bamboo-conversion-monitor.json` importeert + test-execute
- [ ] Mock data: >50 clicks + 0 orders → flag + Telegram alert
- [ ] n8n `bamboo-ab-test-evaluator.json` importeert
- [ ] Mock A/B test >100 sessions + >10% lift → winner declared

**SOP bij falen:** `sops/10-shopify-mcp-debug.md`, `sops/12-conversion-engine-debug.md`

### Fase E2: Systeem 5 — Revenue Engine (60 min)
- [ ] Klaviyo MCP connected: `/customer-segmenter` → Shopify klanten worden gesegmenteerd
- [ ] Airtable heeft 4 nieuwe tabellen (Customer Segments, Email Performance, B2B Leads, Reorder Signals)
- [ ] `/email-flow-builder "reorder 48 rollen"` → flow spec in Bamboo voice (geen preken)
- [ ] `/reorder-engine` → berekent depletion dates correct (24r=60d etc.)
- [ ] `/b2b-prospector "kantoren Amsterdam"` → lead lijst met enrichment
- [ ] `/b2b-outreach` → outreach email nuchter + zakelijk, 2-van-3 check
- [ ] `/reply-classifier "[test reply]"` → correcte classificatie
- [ ] n8n `bamboo-retention-flow-monitor.json` importeert + test
- [ ] n8n `bamboo-b2b-pipeline.json` importeert + test
- [ ] n8n `bamboo-reorder-trigger.json` triggert mock depletion → Klaviyo flow

**SOP bij falen:** `sops/11-klaviyo-mcp-debug.md`, `sops/13-revenue-engine-debug.md`

### Fase F2: Systeem 6 — Intelligence Engine (45 min)
- [ ] Airtable heeft 3 nieuwe tabellen (Daily KPIs, Strategy Reports, Anomaly Log)
- [ ] `/intelligence-brief` aggregeert van alle engines, Dutch markdown output
- [ ] `/pattern-detector "laatste 30 dagen"` → patronen gerapporteerd
- [ ] `/forecast-engine "30 dagen"` → forecast met revenue/inventory/stock
- [ ] `/cross-engine-optimizer` → cross-engine aanbevelingen
- [ ] `dashboard.html` opent in browser → laadt Airtable data na credentials invoer
- [ ] n8n `bamboo-daily-intelligence.json` schedule = 07:30 dagelijks
- [ ] Test-execute → Telegram ochtendbrief binnen 30 sec
- [ ] n8n `bamboo-weekly-strategy-report.json` test-execute → email met rapport
- [ ] n8n `bamboo-anomaly-detector.json` test: inject CPA spike → alert fires

**SOP bij falen:** `sops/14-intelligence-engine-debug.md`

### Fase G: Integratie tests (45 min)
- [ ] 41. **Cross-systeem flow 1**: Systeem 1 scrape winner → Systeem 2 genereert Bamboo versie → Systeem 3 maakt brief
- [ ] 42. **Cross-systeem flow 2**: Bamboo brand brain wordt consistent geladen in alle 3 systemen (check: output voelt identiek in tone)
- [ ] 43. **Brand voice consistency**: 5 willekeurige outputs van alle 3 systemen getest tegen activist-guardrail
- [ ] 44. **Weekly digest**: genereer een test-digest met 10 test-ads → email klopt, tone klopt

### Fase H: Fresh Mac clean install test (30 min)
- [ ] 45. Ga naar een **tweede** schone Mac (of VM, of reset)
- [ ] 46. Run install.sh opnieuw vanaf scratch
- [ ] 47. Tijdmeting: moet <30 min duren voor een gemiddelde user (inclusief vragen)
- [ ] 48. Nathan's README.md stappen doorlopen als non-dev → duidelijkheid check

### Fase I: Sign-off
- [ ] 49. Alle 48 checks groen
- [ ] 50. Bekende issues / limitaties gedocumenteerd in `sign-off-checklist.md`
- [ ] 51. Developer tekent af → build is delivery-ready

---

## Per-systeem test commandos (copy-paste klaar)

### Systeem 1 smoketest
```bash
cd ~/Bamboo && claude
# Binnen Claude Code:
/scrape-ads The Good Roll
/competitor-analyst "wat werkt deze week?"
/scan-competitors
```

### Systeem 2 smoketest
```bash
cd ~/Bamboo && claude
# Binnen Claude Code:
/content-ideator "Ongebleekt 3 laags 48 rollen, waarde angle, 5 ideeën"
/content-scripter "idee #1 van net, 30 sec script"
/generate-ad-statics "hero productshot Ongebleekt 3L, waarde angle, 4K"
/content-machine "weekly run: 3 statics, 2 carousels, 1 video script voor hero"
```

### Systeem 3 smoketest
```bash
cd ~/Bamboo && claude
# Binnen Claude Code:
/ad-brief "cold NL, Ongebleekt 3L 48 rollen, comfort angle"
/ad-machine "test campaign draft, 3 variants, geen upload"
/media-buyer-agent "hoe doen mijn campagnes het?"
```

---

## Test data

Zie `test-data/sample-test-inputs.md` voor:
- Mock ad insights voor performance loop test
- Sample Airtable rows voor digest test
- Pre-filled `.env` met test keys (placeholder — dev vult zelf in)

---

## Rapporteren van bugs

Tijdens testen: log in `testing/BUGS-FOUND.md` (maak aan bij eerste bug):

```markdown
## Bug #X — [korte titel]
- **Fase**: [A-I]
- **Stap**: [checklist nummer]
- **Commando/actie**: [wat deed je]
- **Verwacht**: [wat zou moeten]
- **Gekregen**: [wat gebeurde er]
- **Error**: [logs / stack trace]
- **Fix**: [hoe opgelost, of "nog te doen"]
- **File(s) changed**: [paths]
```

Na fix → retest die specifieke check → update naar `fixed`.

---

## Sign-off criteria

Build is **delivery ready** als:
- ✅ Alle 48 checklist items groen (of gedocumenteerd geaccepteerd)
- ✅ Install script draait in <30 min op schone Mac
- ✅ 3 systemen smoke-tests draaien zonder errors
- ✅ Activist-guardrail + 2-van-3 regel werken aantoonbaar
- ✅ n8n workflows importeren en execute-en correct
- ✅ Geen open critical bugs in BUGS-FOUND.md
- ✅ `sign-off-checklist.md` ingevuld en ondertekend

---

## SOP index

Bij een failure → ga naar het juiste SOP document:

| Probleem | SOP |
|----------|-----|
| install.sh faalt of stopt | `sops/01-install-debug.md` |
| MCP servers connecten niet | `sops/02-mcp-connection-debug.md` |
| Airtable errors (PAT, schema, formula) | `sops/03-airtable-debug.md` |
| Apify scraping faalt / geen data | `sops/04-apify-scraping-debug.md` |
| Meta Ads API errors / token expired | `sops/05-meta-ads-debug.md` |
| n8n workflow import/execute errors | `sops/06-n8n-workflow-debug.md` |
| Content Machine output klopt niet / geen visuals | `sops/07-content-machine-debug.md` |
| Activist-guardrail triggert niet of te veel | `sops/08-activist-guardrail-debug.md` |
| Performance loop pause/scale werkt niet | `sops/09-ad-performance-loop-debug.md` |
| Shopify MCP niet connected | `sops/10-shopify-mcp-debug.md` |
| Klaviyo MCP niet connected | `sops/11-klaviyo-mcp-debug.md` |
| Conversion Engine (S4) output klopt niet | `sops/12-conversion-engine-debug.md` |
| Revenue Engine (S5) flows/B2B werken niet | `sops/13-revenue-engine-debug.md` |
| Intelligence (S6) brief/anomaly/dashboard | `sops/14-intelligence-engine-debug.md` |
