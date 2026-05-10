# Bamboo Build — Developer Sign-Off

**Developer:** _________________________
**Datum test start:** _________________________
**Datum sign-off:** _________________________
**Test omgeving:** _________________________
**macOS versie:** _________________________

---

## Pre-flight ✓

- [ ] Folder structuur compleet (27 files in `bamboo/` + `_modules/` aanwezig)
- [ ] Alle JSON files parsen zonder errors
- [ ] Alle Markdown files renderen correct
- [ ] install.sh heeft execute permissie (`chmod +x`)
- [ ] Geen secrets in git/zip (check .env niet gecommit)

---

## Install ✓

- [ ] install.sh draait volledig tot "installatie compleet" op schone Mac
- [ ] Duur: _______ minuten (target: <30 min)
- [ ] Alle 13 stappen groen zonder `log_err`
- [ ] ~/Bamboo/ gevuld met brand files + systems/ + knowledge-base/
- [ ] ~/.claude/commands/ bevat 42 skills
- [ ] ~/n8n-workflows/bamboo/ bevat 11 workflows
- [ ] ~/.claude/settings.local.json aangemaakt
- [ ] ~/Bamboo/.env aangemaakt

---

## Claude Code + MCPs ✓

- [ ] `claude login` slaagt
- [ ] `cd ~/Bamboo && claude` opent sessie zonder error
- [ ] `/mcp` list toont 8 servers (airtable, apify, meta-ads, nano-banana, google-drive, n8n, shopify, klaviyo)
- [ ] Alle 8 MCPs status: connected
- [ ] CLAUDE.md wordt geladen (check: `cat CLAUDE.md | head` binnen claude sessie werkt)

---

## Systeem 1 — Competitor Scraping ✓

- [ ] Airtable base "Bamboo Ad Research" aangemaakt
- [ ] 3 tabellen met correct schema (Competitors, Ad Research, Weekly Digest)
- [ ] Competitors tabel pre-filled met 4 rows
- [ ] `/scrape-ads The Good Roll` draait zonder error
- [ ] Ad Research tabel gevuld met ≥5 rows
- [ ] Rows hebben correcte velden (Ad Archive ID, Page Name, Body Text, etc.)
- [ ] `/competitor-analyst "weekly overview"` produceert rapport
- [ ] Rapport is in Nederlands + Bamboo brand voice
- [ ] n8n workflow `bamboo-competitor-daily-scrape.json` importeert
- [ ] Manual execute → Telegram ping ontvangen
- [ ] n8n workflow `bamboo-weekly-digest.json` importeert
- [ ] Manual execute → test email ontvangen met digest

**Bekende issues Systeem 1:** ______________________________

---

## Systeem 2 — Content Machine ✓

- [ ] `/content-ideator "Ongebleekt 3L 48 waarde"` → 5 concepten
- [ ] Output in Nederlands
- [ ] Output voelt nuchter, niet activistisch
- [ ] Output bevat minimaal 2-van-3 kernregels per concept
- [ ] `/content-scripter "maak script van idee 1"` → volledig UGC script
- [ ] `/generate-ad-statics "hero shot Ongebleekt 3L"` → 4K PNG gegenereerd
- [ ] PNG staat in ~/Bamboo/01-content-production/ of Drive
- [ ] `/static-to-video "laatste static"` → animatie output
- [ ] `/content-machine "weekly run 3 statics"` → end-to-end in <10 min
- [ ] **Activist-guardrail TEST**: input "maak een morele eco-pitch voor 3L" → output is herschreven nuchter (NIET de originele prekende versie)
- [ ] **2-van-3 TEST**: input "alleen een eco-claim" → output bevat waarde-regel toegevoegd
- [ ] **Engels TEST**: input "make an English ad" → output is alsnog Nederlands OF expliciete bevestiging gevraagd

**Bekende issues Systeem 2:** ______________________________

---

## Systeem 3 — Ad Management ✓

- [ ] Meta Ads MCP connected met test account
- [ ] `/media-buyer-agent "status"` toont live account data
- [ ] `/ad-brief "test brief Ongebleekt 3L cold NL"` → volledige brief
- [ ] Brief is in Bamboo brand voice (nuchter)
- [ ] Brief bevat hook uit hookbank.md
- [ ] `/ad-machine "draft test campaign"` → structuur (campaign + adset + 3 ads)
- [ ] `/ad-machine` doet **geen** live upload in dry-run mode
- [ ] n8n `bamboo-ad-performance-loop.json` importeert
- [ ] Mock data test: ROAS 1.0 + spend €25 → action = pause ✓
- [ ] Mock data test: ROAS 3.5 + spend €50 → action = scale +20% ✓
- [ ] Mock data test: CTR 0.3% + impr 2000 → action = flag ✓
- [ ] Decisions Log tabel gevuld met test beslissingen
- [ ] Telegram ping ontvangen met summary

**Bekende issues Systeem 3:** ______________________________

---

## Systeem 4 — Conversion Engine ✓

- [ ] Shopify MCP connected: `/mcp` toont shopify als connected
- [ ] Airtable tabellen aangemaakt: Conversion Tracking, AB Tests, Page Variants
- [ ] `/conversion-analyst "laatste 7 dagen"` geeft rapport met orders + CR + CPA
- [ ] `/page-optimizer "Ongebleekt 3L hero copy"` → 2 varianten, Dutch, 2-van-3 check
- [ ] `/pricing-strategist` → bundel proposals met margin math
- [ ] `/ab-test-manager "create test"` → schrijft naar AB Tests tabel
- [ ] `/store-page-audit` → audit rapport met concrete fixes
- [ ] `/checkout-optimizer` → cart/shipping/upsell copy Bamboo voice
- [ ] `/bundle-creator` → bundel spec ready-to-upload
- [ ] n8n `bamboo-conversion-monitor` importeert, schedule elke 6 uur
- [ ] Mock test: >50 clicks + 0 orders → flag + Telegram alert
- [ ] n8n `bamboo-ab-test-evaluator` importeert, schedule dagelijks 22:00
- [ ] Mock A/B test significant → winner declared in Airtable

**Bekende issues Systeem 4:** ______________________________

---

## Systeem 5 — Revenue Engine ✓

- [ ] Klaviyo MCP connected
- [ ] Airtable tabellen: Customer Segments, Email Performance, B2B Leads, Reorder Signals
- [ ] `/customer-segmenter` → Shopify klanten gesegmenteerd naar 6 tiers
- [ ] `/email-flow-builder "reorder 48 rollen"` → flow spec zonder activist taal
- [ ] `/reorder-engine` → depletion dates correct per volume
- [ ] `/b2b-prospector "kantoren Amsterdam"` → lead lijst in Airtable
- [ ] `/b2b-outreach` → nuchter zakelijk email (geen hype)
- [ ] `/reply-classifier "[test text]"` → juiste interest/objection classification
- [ ] `/respond-to-leads` → pipeline updates correct
- [ ] `/revenue-analyst` → LTV + cohort rapport
- [ ] n8n `bamboo-retention-flow-monitor` schedule 08:00
- [ ] n8n `bamboo-b2b-pipeline` schedule 09:00 + 15:00
- [ ] n8n `bamboo-reorder-trigger` schedule 10:00
- [ ] Test: klant met last order 50 dagen geleden + 24 rollen → reminder triggert

**Bekende issues Systeem 5:** ______________________________

---

## Systeem 6 — Intelligence Engine ✓

- [ ] Airtable tabellen: Daily KPIs, Strategy Reports, Anomaly Log
- [ ] `/intelligence-brief` aggregeert data van Engines 1-5
- [ ] `/pattern-detector "30 dagen"` → patronen zichtbaar
- [ ] `/forecast-engine "30 dagen"` → revenue + inventory forecast
- [ ] `/cross-engine-optimizer` → min 1 cross-engine recommendation
- [ ] `/finance-analyst` → unit economics per productlijn
- [ ] n8n `bamboo-daily-intelligence` schedule 07:30
- [ ] Test-execute → Telegram ochtendbrief binnen 30 sec
- [ ] n8n `bamboo-weekly-strategy-report` schedule maandag 10:00
- [ ] Test-execute → email met strategierapport
- [ ] n8n `bamboo-anomaly-detector` schedule elke 4 uur
- [ ] Inject CPA spike → alert fires (geen noise bij normal state)
- [ ] `dashboard.html` opent in browser, laadt live Airtable data
- [ ] Dashboard toont alle 6 engines data (revenue, ROAS, CR, repeat rate, B2B pipeline, anomalies)

**Bekende issues Systeem 6:** ______________________________

---

## Integratie tests ✓

- [ ] Cross-systeem: Systeem 1 winner → Systeem 2 Bamboo versie → Systeem 3 brief (flow werkt)
- [ ] Brand voice consistent over alle 3 systemen (5 random outputs getest)
- [ ] Alle 3 systemen laden CLAUDE.md + brand files correct
- [ ] Geen output krijgt activist taal voorbij de guardrail

---

## Fresh Mac clean install (optioneel maar aanbevolen) ✓

- [ ] Tweede schone Mac getest
- [ ] Install script draait zonder interventie behalve password prompts
- [ ] Non-dev user kan Nathan's README volgen zonder vast te lopen
- [ ] Duur end-to-end (install + keys + eerste test): _______ minuten

---

## Documentation review ✓

- [ ] `README.md` in `install/` is begrijpelijk voor niet-developer (Nathan)
- [ ] `DELIVERY.md` bevat scope-creep message
- [ ] Per systeem README uitlegt wat het doet + hoe te gebruiken
- [ ] Airtable schemas documenteren alle velden + formules
- [ ] `.env.template` uitlegt waar elke key vandaan komt
- [ ] `meta-ads-setup.md` is volledig + klopt met huidige Meta Developer flow

---

## Security review ✓

- [ ] Geen hardcoded keys in enige file
- [ ] `.gitignore` sluit .env, settings.local.json, credentials.json uit
- [ ] `.env.template` bevat alleen placeholders
- [ ] MCP server configs lezen env vars, niet hardcoded
- [ ] Logs bevatten geen keys bij normale runs

---

## Final sign-off

**Totaal checks groen:** _______ / 87
**Critical bugs open:** _______ (moet 0 zijn)
**Minor issues open:** _______ (mogen blijven als gedocumenteerd)

**Developer beslissing:**
- [ ] ✅ **APPROVED FOR DELIVERY** — build is klaar om naar Nathan te sturen
- [ ] ⚠️ **APPROVED MET NOTES** — gedocumenteerde issues, Nathan krijgt een heads-up
- [ ] ❌ **NIET APPROVED** — critical issues, bug fixes nodig vóór delivery

**Developer naam:** _________________________
**Handtekening / git commit SHA:** _________________________
**Datum:** _________________________

---

## Notes voor handover naar Leon

```
[vrije ruimte voor developer opmerkingen: wat werkte goed, wat was lastig,
waar Nathan extra support nodig heeft, welke bekende beperkingen, etc.]
```
