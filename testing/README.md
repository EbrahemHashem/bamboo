# Bamboo Build — Testing & Debug

Deze folder bevat alles wat een developer nodig heeft om de Bamboo build end-to-end te testen en debuggen voordat we naar Nathan leveren.

---

## Start hier

1. **Lees eerst**: `TEST-PLAN.md` — master plan met 48 checklist items verdeeld over 9 fases
2. **Vul in tijdens test**: `sign-off-checklist.md` — developer sign-off form
3. **Bij bugs**: zoek het juiste SOP in `sops/` en volg de stappen
4. **Bij onduidelijkheden**: WhatsApp Leon direct

---

## Folder structuur

```
testing/
├── README.md                      ← dit bestand
├── TEST-PLAN.md                   ← master plan (start hier)
├── sign-off-checklist.md          ← developer sign-off formulier
│
├── sops/                          ← per failure mode een SOP
│   ├── 01-install-debug.md         — install.sh failures
│   ├── 02-mcp-connection-debug.md  — MCP servers disconnected
│   ├── 03-airtable-debug.md        — Airtable API/schema errors
│   ├── 04-apify-scraping-debug.md  — Meta Ad Library scraping
│   ├── 05-meta-ads-debug.md        — Meta Ads API / tokens
│   ├── 06-n8n-workflow-debug.md    — n8n import/execute issues
│   ├── 07-content-machine-debug.md — Content skills / visuals
│   ├── 08-activist-guardrail-debug.md — Brand voice guardrail
│   └── 09-ad-performance-loop-debug.md — Auto pause/scale loop
│
└── test-data/
    └── sample-test-inputs.md      ← copy-paste test commandos + mock data
```

---

## Test flow in 1 minuut

```
A. Pre-flight (30m)        — folder check, file integrity
B. Install (45m)           — install.sh op schone Mac
C. Claude + MCPs (45m)     — settings, login, mcp list
D. Systeem 1 (60m)         — scrape + Airtable + n8n + digest
E. Systeem 2 (60m)         — content + visuals + guardrail tests
F. Systeem 3 (60m)         — briefs + Meta + performance loop
G. Integratie (45m)        — cross-systeem flows, brand consistency
H. Fresh Mac retest (30m)  — non-dev install walkthrough
I. Sign-off                — checklist invullen + handtekening
```

**Totaal**: ~6 uur eerste volledige run. ~1-2 uur per retest na fixes.

---

## Bug tracking

Bij elke bug die je vindt:

1. **Log in** `BUGS-FOUND.md` (maak aan bij eerste bug, in deze folder)
2. **Format**:
   ```markdown
   ## Bug #X — [korte titel]
   - **Fase**: [A-I]
   - **Stap checklist**: [1-48]
   - **Commando/actie**: wat deed je
   - **Verwacht**: wat zou moeten
   - **Gekregen**: wat gebeurde er
   - **Error log**: stack trace of error message
   - **Fix**: hoe opgelost (of "todo")
   - **Files changed**: paths
   - **Retested**: ja/nee
   ```
3. **Priority**:
   - 🔴 **Critical**: blokkeert delivery (install fails, systeem werkt niet)
   - 🟡 **Major**: werkt wel maar niet zoals bedoeld (brand voice afwijkt, guardrail te zwak)
   - 🟢 **Minor**: cosmetisch of edge case (spelfouten, rare edge case)

---

## Test accounts setup

**Gebruik ALTIJD test accounts, nooit Nathan's productie data!**

Maak nieuwe test accounts voor:
- **Anthropic Claude** — developer console met eigen key
- **Airtable** — nieuwe workspace "Bamboo Test"
- **Apify** — gratis tier met $5 credit
- **Meta Developer** — nieuwe test app + sandbox ad account
- **Google** — test account voor Drive
- **Telegram** — nieuwe bot via @BotFather voor test notifications

Na delivery: swap credentials voor Nathan's productie setup. Sign-off checklist heeft dit als punt.

---

## Communicatie tijdens testing

### Voortgang updates naar Leon
Elke 2 uur of bij belangrijke findings een update:
- ✅ Wat werkt
- ⚠️ Wat is kapot + welk SOP gebruikt
- 🔴 Blockers waar je stuk op loopt

### Blockers
Als je langer dan 30 min vastzit op iets → WhatsApp Leon met:
- Wat je probeerde
- Error message (screenshot of log)
- Welk SOP document je al gevolgd hebt

### Sign-off moment
Na alle 48 checks: stuur `sign-off-checklist.md` ingevuld naar Leon. Hij reviewt en geeft go voor delivery of vraagt om fixes.

---

## Wat NIET testen

Deze dingen zitten bewust niet in scope van de €5.500 build en hoeven niet getest:

- ❌ Shopify webshop bouw of copy
- ❌ Bol.com listing updates
- ❌ B2B salesplaybook uitvoering
- ❌ Email flow implementaties
- ❌ Homepage wireframes
- ❌ 90-dagen consulting begeleiding

Als je deze dingen tegenkomt in de Company Bible → die vallen onder scope creep, niet onder delivery.

---

## Na de test

Zodra de build groen is op alle 48 checks:

1. **Clean up test data** — wis test Airtable base, test ad campaigns in Meta, test Drive files
2. **Reset env vars** — remove test credentials uit `.env.template` en `settings.json.template` (moeten placeholders blijven)
3. **Final zip** — `bamboo/` + `_modules/` samen zippen als `bamboo-ai-system.zip`
4. **Handover** — sign-off-checklist + BUGS-FOUND.md + zip → naar Leon
5. **Support klaar** — wees beschikbaar tijdens Nathan's eerste install (remote pair via screenshare)

---

## Success criteria

Build is **delivery ready** als:
- ✅ Alle 48 checklist items groen
- ✅ Install <30 min op schone Mac
- ✅ 3 systemen draaien smoketest zonder errors
- ✅ Activist-guardrail werkt aantoonbaar (test 1 + 2 + 3 uit sample-test-inputs.md)
- ✅ Brand voice consistent over alle 3 systemen
- ✅ Performance loop pause/scale/flag correct op mock data
- ✅ Geen critical bugs open
- ✅ sign-off-checklist.md ingevuld + ondertekend
- ✅ BUGS-FOUND.md gedocumenteerd (ook als leeg)

Succes! 🎯
