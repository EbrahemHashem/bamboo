# Systeem 3 — Ad Management

## Wat dit systeem doet
Meta Ads campagne management voor Bamboo: briefs schrijven, creatives bundelen, uploaden naar Meta Ads Manager (altijd paused voor review), en daarna automatisch monitoren op ROAS. Winners scalen automatisch, losers worden gepauzeerd.

**Brand brain:** dezelfde bronnen als Systeem 2 — `CLAUDE.md`, `brand-voice.md`, `hookbank.md`, `creative-strategy.md`, `products.md`.

---

## Hoe Nathan het gebruikt

### Nieuwe campagne aanmaken
```
/ad-machine "nieuwe campagne Ongebleekt 3 laags 48 rollen, cold traffic, waarde angle, 3 hooks testen"
```
Output:
- Campagne structuur (campaign → adset → ads)
- 3 ad variants met verschillende hooks uit `hookbank.md`
- Visuals uit Systeem 2 (automatisch gekoppeld)
- Voorstel budget + targeting
- Upload naar Meta Ads (als PAUSED) — wacht op Nathan's go

### Snelle brief
```
/ad-brief "comfort-angle voor Blanc 3 laags 48 rollen, vrouwelijk 30-55 NL/BE"
```
→ Volledige brief met hook, angle, visual, copy, targeting

### Bulk upload
```
/bulk-ads-upload "laatste 10 approved statics uit Drive → test campaign Q2 hero"
```
→ Batch upload naar Meta Ads Manager

### Launch (na Nathan's approval)
```
/launch-ads "zet campagne Q2-hero-test live"
```
→ Status van PAUSED naar ACTIVE, notificatie naar Nathan

### Performance check
```
/media-buyer-agent "hoe draaien m'n campagnes? Waar moet ik op ingrijpen?"
```
→ Analyse uit Airtable + aanbevelingen

### Automatische monitoring (draait op n8n)
Elke 4 uur checkt de workflow:
- **ROAS < 1.5 + spend > €20** → PAUSE
- **ROAS > 3.0 + budget < cap** → SCALE +20%
- **CTR < 0.5%** → FLAG voor creative refresh
- **CPA > max_cpa** → PAUSE

---

## Bamboo-specifieke performance regels

Standaard thresholds (pas aan in Airtable tabel `Performance Rules`):

| Metric | Pause threshold | Scale threshold | Flag threshold |
|--------|-----------------|-----------------|----------------|
| ROAS | < 1.5 | > 3.0 | 1.5-2.0 (monitor) |
| Spend (dag) | > €20 voor pause check | n.v.t. | n.v.t. |
| CTR | n.v.t. | n.v.t. | < 0.5% |
| CPC | > €2.50 | n.v.t. | > €1.50 |
| CPA (conv) | > €15 | < €8 | €10-15 |

**Waarom deze waarden**: Bamboo zit in rustige DTC categorie, product ticketgrootte ligt rond €25-60 (24-96 rollen), marge ~30%. ROAS 1.5 is break-even-achtig inclusief marge, 3.0 is solide winstgevend.

**Nathan kan deze tunen** via een Airtable row zonder dat ik iets hoef aan te passen aan de code.

---

## Campagne structuur voor Bamboo (template)

### Campagne 1: Hero Test — Ongebleekt 3L 48 rollen (HERO PRODUCT)
```
Campaign: Bamboo - Hero - Ongebleekt 3L 48
├── Adset 1: Cold NL - Bewust 30-55
│   ├── Ad 1: Waarde hook (hookbank waarde-1)
│   ├── Ad 2: Comfort hook (hookbank comfort-2)
│   └── Ad 3: Contrast hook (hookbank contrast-1)
├── Adset 2: Cold NL - Rationeel 25-60
│   └── 3 varianten
└── Adset 3: Retargeting (website visitors 30d)
    └── 3 varianten
```

### Campagne 2: Rationele Instap — Ongebleekt 2L 24+48
```
Campaign: Bamboo - Instap - Ongebleekt 2L
├── Adset 1: Cold NL - Prijsbewust
│   └── Waarde-hooks focus
```

### Campagne 3: Mainstream Comfort — Blanc 3L 48
```
Campaign: Bamboo - Mainstream - Blanc 3L
├── Adset 1: Cold NL - Comfort zoekers
```

### Campagne 4: B2B/Retention — 96 rollen varianten
Aparte structuur, wordt handmatig opgezet door Nathan — niet in auto-scale loop.

---

## Technische setup

### MCP servers
- **Meta Ads** (uit LIO_OS ZIP: `~/.lio_os/systems/ad-systems/reference/meta-ads-mcp/server.py`)
- **Airtable** (voor Ad Research + Performance Rules + Decisions Log)
- **Google Drive** (voor creatives link naar Systeem 2 Drive)

### Airtable tabellen (in zelfde base als Systeem 1: "Bamboo Ad Research")
Extra tabellen voor Systeem 3:

1. **Campaigns** — campagne registratie + status
2. **Ad Variants** — individuele ad rows met performance tracking
3. **Performance Rules** — aanpasbare thresholds (pause/scale/flag)
4. **Decisions Log** — elke auto-beslissing met timestamp, reden, action taken

### Skills die dit systeem gebruikt
- `/ad-machine` — orchestrator (nieuwe campagne end-to-end)
- `/ad-brief` — brief generatie
- `/launch-ads` — paused → active flip
- `/bulk-ads-upload` — batch upload
- `/script-ads` — ad copy generation (roept Systeem 2 aan)
- `/media-buyer-agent` — performance analyse + aanbevelingen

### n8n workflow
`bamboo-ad-performance-loop.json` — draait elke 4 uur, automatische pause/scale/flag.

---

## Environment variables

```bash
META_AD_ACCOUNT_ID=act_xxx
META_ACCESS_TOKEN=xxx         # Long-lived user token met ads_management scope
META_APP_ID=xxx
META_APP_SECRET=xxx
AIRTABLE_API_KEY=pat_xxx
AIRTABLE_BASE_ID=appXXX       # zelfde als Systeem 1
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHAT_ID=xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

**Meta Ads token setup**: Nathan moet eenmalig een Meta Developer App aanmaken en een long-lived access token genereren. Instructies in `meta-ads-setup.md` in deze folder.

---

## Veiligheidsregels

1. **Nieuwe campagnes starten ALTIJD als PAUSED** — Nathan moet expliciet goedkeuren
2. **Auto-scale max +20% per run** — voorkomt runaway spending
3. **Dagelijkse budget cap** in Airtable — als totale spend > cap, alles pausen
4. **Pause threshold ROAS 1.5** — niet lager, om break-even te garanderen
5. **Bij API errors** → pause alle recent changes + Telegram alert naar Nathan

---

## Verificatie na installatie

1. `/ad-brief "test brief Ongebleekt 3L waarde-angle"` → draait in Bamboo voice
2. Meta Ads MCP connected: `/media-buyer-agent "status"` → toont live ad account data
3. Airtable `Campaigns`, `Ad Variants`, `Performance Rules` tables bestaan en hebben schema
4. Dry-run van `/ad-machine` → genereert campagne structuur zonder te uploaden
5. `bamboo-ad-performance-loop.json` geïmporteerd in n8n, test-run lukt zonder errors
6. Test-ad handmatig op PAUSED gezet in Meta Ads Manager → workflow detecteert en logt in Decisions Log
