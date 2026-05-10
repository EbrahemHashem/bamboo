# Bamboo Disposables BV — Delivery Package v2

**Klant:** Nathan (+ broer)
**Deal:** €5.500 custom AI build — **uitgebreid naar volledig AI Growth Operating System**
**Status:** Ready for delivery
**Datum:** 2026-04-14
**Versie:** 2.0 (6 systemen / 4 engines)

---

## Inhoud van deze build

### Wat Nathan krijgt (in scope)

```
bamboo/
├── CLAUDE.md                         ← brand brain (Bamboo merkregels)
├── brand-voice.md                    ← tone, do/don't, activist-guardrail
├── avatar.md                         ← 4 klantsegmenten + JTBD
├── products.md                       ← 3 kernlijnen + 9 Bol listings
├── competitors.json                  ← 4 concurrenten (pre-filled)
├── hookbank.md                       ← hooks per koopmotief
├── creative-strategy.md              ← copyprincipes + ad formules
├── top-ads.md                        ← auto-filled door Systeem 1+3
│
├── systems/
│   ├── 1-competitor-scraping/
│   │   ├── README.md                         ← runbook
│   │   ├── bamboo-competitor-daily-scrape.json  ← n8n daily workflow
│   │   ├── bamboo-weekly-digest.json            ← n8n weekly digest
│   │   └── airtable-schema.md                ← Airtable setup
│   │
│   ├── 2-content-machine/
│   │   ├── README.md                 ← runbook
│   │   ├── activist-guardrail.md     ← tone check systeem
│   │   ├── drive-structure.json      ← Google Drive folder setup
│   │   └── content-templates.md      ← 6 herbruikbare templates
│   │
│   ├── 3-ad-management/
│   │   ├── README.md                           ← runbook
│   │   ├── bamboo-ad-performance-loop.json     ← n8n auto pause/scale
│   │   ├── meta-ads-setup.md                   ← Meta token guide
│   │   └── airtable-schema-ads.md              ← ads tabellen schema
│   │
│   ├── 4-conversion-engine/              ← NIEUW — Shopify optimalisatie
│   │   ├── README.md
│   │   ├── airtable-schema-conversion.md
│   │   ├── shopify-setup.md
│   │   ├── conversion-guardrails.md
│   │   ├── bamboo-conversion-monitor.json      ← n8n elke 6 uur
│   │   ├── bamboo-ab-test-evaluator.json       ← n8n dagelijks 22:00
│   │   └── skills/ (7 skills)
│   │
│   ├── 5-revenue-engine/                 ← NIEUW — retentie + B2B
│   │   ├── README.md
│   │   ├── airtable-schema-revenue.md
│   │   ├── klaviyo-setup.md
│   │   ├── email-templates.md
│   │   ├── b2b-target-groups.md
│   │   ├── bamboo-retention-flow-monitor.json  ← n8n dagelijks 08:00
│   │   ├── bamboo-b2b-pipeline.json           ← n8n 2x/dag
│   │   ├── bamboo-reorder-trigger.json        ← n8n dagelijks 10:00
│   │   └── skills/ (9 skills)
│   │
│   └── 6-intelligence-engine/            ← NIEUW — centrale hersenlaag
│       ├── README.md
│       ├── airtable-schema-intelligence.md
│       ├── kpi-definitions.md
│       ├── dashboard.html                      ← management dashboard
│       ├── bamboo-daily-intelligence.json      ← n8n dagelijks 07:30
│       ├── bamboo-weekly-strategy-report.json  ← n8n maandag 10:00
│       ├── bamboo-anomaly-detector.json        ← n8n elke 4 uur
│       └── skills/ (5 skills)
│
├── knowledge-base/
│   ├── README.md
│   ├── company-bible-sections.md     ← mapping bible → system files
│   └── AI-Growth-Operating-System-Blueprint.pdf  ← blueprint referentie
│
└── install/
    ├── install.sh                    ← automatische installer
    ├── README.md                     ← Nathan's install guide
    ├── .env.template                 ← API keys placeholder
    └── settings.json.template        ← Claude Code config
```

### Geïnstalleerde componenten op Nathan's laptop

Na `install.sh` draaien:

**Software:**
- Homebrew, Git, Python 3, Node.js, Claude Code CLI
- (Optioneel) Docker voor lokale n8n
- Python packages: httpx, mcp[cli], fastmcp

**Skills** in `~/.claude/commands/` (42 totaal):
- **Systeem 1**: `/scrape-ads`, `/competitor-research`, `/competitor-analyst`
- **Systeem 2**: `/content-machine`, `/content-ideator`, `/content-scripter`, `/daily-content-researcher`, `/generate-ad-statics`, `/static-to-video`, `/image-prompt-architect`, `/script-ads`
- **Systeem 3**: `/ad-machine`, `/ad-brief`, `/launch-ads`, `/bulk-ads-upload`, `/media-buyer-agent`
- **Systeem 4**: `/conversion-analyst`, `/page-optimizer`, `/pricing-strategist`, `/ab-test-manager`, `/store-page-audit`, `/checkout-optimizer`, `/bundle-creator`
- **Systeem 5**: `/customer-segmenter`, `/email-flow-builder`, `/reorder-engine`, `/b2b-prospector`, `/b2b-outreach`, `/reply-classifier`, `/respond-to-leads`, `/cs-agent`, `/revenue-analyst`
- **Systeem 6**: `/intelligence-brief`, `/pattern-detector`, `/forecast-engine`, `/cross-engine-optimizer`, `/finance-analyst`
- **Ondersteunend**: `/n8n`, `/mcp-builder`, `/skill-builder`

**MCP Servers** in `~/mcp-servers/` (8 totaal):
- Airtable, Apify, Meta Ads, Nano Banana 2, Google Drive, n8n
- **NIEUW:** Shopify, Klaviyo

**n8n workflows** in `~/n8n-workflows/bamboo/` (11 totaal):
- bamboo-competitor-daily-scrape (dagelijks 07:00)
- bamboo-weekly-digest (maandag 09:00)
- bamboo-ad-performance-loop (elke 4 uur)
- bamboo-conversion-monitor (elke 6 uur)
- bamboo-ab-test-evaluator (dagelijks 22:00)
- bamboo-retention-flow-monitor (dagelijks 08:00)
- bamboo-b2b-pipeline (2x/dag 09:00+15:00)
- bamboo-reorder-trigger (dagelijks 10:00)
- bamboo-daily-intelligence (dagelijks 07:30)
- bamboo-weekly-strategy-report (maandag 10:00)
- bamboo-anomaly-detector (elke 4 uur)

**Airtable tables** (17 totaal in één "Bamboo Ad Research" base):
- Systeem 1 (3): Competitors, Ad Research, Weekly Digest
- Systeem 3 (4): Campaigns, Ad Variants, Performance Rules, Decisions Log
- Systeem 4 (3): Conversion Tracking, AB Tests, Page Variants
- Systeem 5 (4): Customer Segments, Email Performance, B2B Leads, Reorder Signals
- Systeem 6 (3): Daily KPIs, Strategy Reports, Anomaly Log

**Project folder** `~/Bamboo/`:
- Alle context files + systems + knowledge-base + .env

---

## Wat NU wel in de build zit (v2 uitbreiding)

De v1 build (3 systemen, €5.500) is uitgebreid met de volledige Growth OS blueprint. Dit zit er **extra** bij:

| v2 toevoeging | Wat het doet |
|---------------|--------------|
| **Conversion Engine (Systeem 4)** | Shopify conversie-optimalisatie, A/B test framework, bundel- en prijsstrategie, "clicks no conversion" alerts |
| **Revenue Engine (Systeem 5)** | Klaviyo email/SMS flows (welkom, reorder, winback, upsell), B2B leadgen voor 4 sectoren, reply classifier, reorder automation op basis van verbruiksdata |
| **Intelligence Engine (Systeem 6)** | Centrale analytics over alle engines, dagelijkse ochtendbrief, wekelijks strategierapport, anomaly detector, HTML management dashboard |
| Blueprint PDF | Originele Growth OS blueprint als referentie in `knowledge-base/` |

## Wat Nathan nog steeds zelf doet (uitvoerwerk, geen software)

| Wat | Waarom |
|-----|--------|
| 9 Bol.com listings opschonen + herschrijven | Bol heeft geen API voor direct publiceren — Nathan krijgt wel copy uit `/page-optimizer` |
| Shopify product page copy live zetten | Systeem genereert + A/B tests → Nathan kopieert naar Shopify admin |
| Klaviyo flows live zetten | Systeem bouwt spec + templates → Nathan reviewt en activeert in Klaviyo |
| B2B outreach verzenden | Systeem genereert + logt → Nathan stuurt via eigen inbox of via Instantly/Lemlist (eigen tool) |
| 90-dagen strategische begeleiding | Optioneel als consulting engagement |

**Het principe blijft**: de build levert de **machines en pipelines**. Nathan blijft in de loop voor publicatie en strategische beslissingen (geen volledig autonoom systeem dat zelf ads of emails live zet zonder approval).

---

## Verificatie checklist vóór delivery

- [ ] Install script test op fresh Mac in <45 min
- [ ] Alle 42 skills kopiëren correct naar `~/.claude/commands/`
- [ ] Airtable schema documentatie compleet voor alle 17 tabellen
- [ ] 11 n8n workflows importeerbaar, schedules correct
- [ ] `.env.template` bevat alle benodigde keys (inclusief Shopify + Klaviyo)
- [ ] `settings.json.template` klopt met alle 8 MCP servers
- [ ] README.md voor Nathan is glasheldere stap-voor-stap
- [ ] Activist-guardrail test: systeem weigert prekende output en herschrijft
- [ ] 2-van-3 regel test: systeem voegt ontbrekende kernregel toe
- [ ] CLAUDE.md laadt correct als brand brain in alle 6 systemen
- [ ] Weekly digest (S1) genereert correcte Bamboo brand voice rapport
- [ ] Ad performance loop (S3) pause/scale logica triggered op testdata
- [ ] Conversion monitor (S4) flags "clicks no conversion" correct
- [ ] AB test evaluator (S4) declares winner bij significantie
- [ ] Retention flow monitor (S5) detecteert declining flows
- [ ] Reorder trigger (S5) triggert Klaviyo flow bij depletion window
- [ ] Daily intelligence brief (S6) aggregeert data van alle engines
- [ ] Anomaly detector (S6) fires alleen bij echte anomalies (geen noise)
- [ ] Dashboard.html opent en laadt data uit Airtable

---

## Handover naar Nathan

1. **Zip** de `bamboo/` folder + `_modules/` folder samen tot `bamboo-ai-system.zip`
2. **Stuur** via WeTransfer of Google Drive
3. **WhatsApp Nathan**:
   - Link naar zip
   - Kort bericht met install volgorde
   - Vraag of hij een screenshare wil voor Stap 4 (.env invullen) en Stap 5 (Airtable base)
4. **Welcome call** (60 min): live walkthrough + eerste test run + Q&A
5. **Eerste 30 dagen**: directe WhatsApp support voor debugging en vragen
6. **Na 30 dagen**: community support via Circle

---

## Mail/WhatsApp template naar Nathan (scope creep gesprek)

> Yo Nathan,
>
> Ik heb de Company Bible doorgespit — dikke input, ga ik volledig als brein laden voor je systeem. Wel even scope check voordat ik afrond, want de bible bevat veel meer dan wat we voor €5.500 hebben afgesproken.
>
> **Wat je krijgt voor €5.500** (de 3 systemen op je laptop):
> - **Concurrentiescraping** — dagelijks The Good Roll, Bamboi, Cheeky Panda en Who Gives A Crap scrapen. Hooks, angles, formats in een database. Wekelijks rapport wat werkt.
> - **Content machine** — draait volledig op je brand voice uit de Company Bible. Research → script → 4K visual of carousel → caption. Jij keurt goed en post.
> - **Ad management** — Meta Ads gekoppeld, auto pause/scale op ROAS, dashboard in Airtable. Hookbank uit je bible zit er al in.
> - Installatie op je laptop + 8-module videocursus.
>
> **Wat niet in de €5.500 zit** (en wat de Company Bible óók vraagt):
> - Je 9 Bol listings opschonen + herschrijven
> - Webshop/Shopify pagina's bouwen (homepage, productpagina's, FAQ, email flows)
> - B2B salesplaybook draaien (cold outreach, follow-ups)
> - 90-dagen implementatie begeleiden als consultant
>
> Dat is strategisch uitvoerwerk, geen software. De build die ik lever is **de machine** waarmee jij dat werk 10x sneller doet — maar de uitvoering zelf is een andere pet.
>
> **2 opties:**
> - **A.** We houden €5.500, jij krijgt de 3 systemen zoals afgesproken. Jij gebruikt ze om de rest van de Company Bible uit te voeren. Klaar om te leveren deze week.
> - **B.** Je wil dat wij ook de uitvoering leveren (Bol listings, Shopify copy, B2B outreach). Dat is een apart traject — ik stuur je een losse offerte met scope + prijs.
>
> Laat me weten welke kant je op wil, dan pak ik het op. Ik denk persoonlijk A + B apart — dan blijft de software build clean en kunnen we execution los plannen als jij er klaar voor bent.
