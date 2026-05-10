# Test Data — Sample Inputs

Voor alle test fases. Copy-paste deze inputs om consistente test runs te doen.

---

## Systeem 1 — Competitor Scraping

### Competitors pre-fill (Airtable)
```json
[
  {
    "Name": "The Good Roll",
    "Status": "Active",
    "Priority": "High",
    "Facebook Page ID": "NOG_INVULLEN_DEV",
    "Instagram Handle": "@thegoodroll",
    "Website": "https://www.thegoodroll.com",
    "Niche": "Duurzaam bamboe + gerecycled",
    "Scrape Frequency": "daily"
  },
  {
    "Name": "Bamboi",
    "Status": "Active",
    "Priority": "High",
    "Facebook Page ID": "NOG_INVULLEN_DEV",
    "Instagram Handle": "@bamboi.nl",
    "Website": "https://www.bamboi.nl",
    "Niche": "100% bamboe toiletpapier",
    "Scrape Frequency": "daily"
  },
  {
    "Name": "The Cheeky Panda",
    "Status": "Active",
    "Priority": "Medium",
    "Facebook Page ID": "NOG_INVULLEN_DEV",
    "Instagram Handle": "@thecheekypanda",
    "Website": "https://uk.cheekypanda.com",
    "Niche": "Zacht bamboe + subscriptions",
    "Scrape Frequency": "daily"
  },
  {
    "Name": "Who Gives A Crap",
    "Status": "Active",
    "Priority": "High",
    "Facebook Page ID": "NOG_INVULLEN_DEV",
    "Instagram Handle": "@whogivesacrap",
    "Website": "https://nl.whogivesacrap.org",
    "Niche": "Bamboe + recycled, fun branding",
    "Scrape Frequency": "daily"
  }
]
```

**Developer taak**: Facebook Page IDs ophalen via https://www.facebook.com/ads/library/?view_all_page_id=... voor elk merk. Vul in `competitors.json` + Airtable.

### Test commandos
```
/scrape-ads The Good Roll
/competitor-research The Cheeky Panda
/competitor-analyst "Welke hooks werken nu?"
/scan-competitors
```

### Mock ad row (voor weekly digest test zonder echte scrape)
```json
{
  "Ad Archive ID": "MOCK_123456",
  "Page Name": "The Good Roll",
  "Competitor": ["recXXX"],
  "Start Date": "2026-04-05",
  "Is Active": true,
  "Display Format": "Video",
  "Body Text": "Double length toilet paper. 2x langer dan normale rollen. Bamboe en recycled. Voor een betere wereld.",
  "Hook": "Double length toilet paper",
  "Angle Category": "Waarde",
  "Days Live": 6,
  "Impressions Range": "100K-500K",
  "Winner Status": "Rising"
}
```

---

## Systeem 2 — Content Machine

### Test prompts — normale flow
```
/content-ideator "Ongebleekt 3 laags 48 rollen, waarde angle, 5 concepten voor Instagram feed"
/content-scripter "Concept 3 van net — maak 30sec UGC script, talking head, NL"
/generate-ad-statics "Hero productshot Ongebleekt 3L 48 rollen, rustige badkamer setting, 4K, waarde hook overlay"
/static-to-video "Laatste static, 6 seconden, zoom + pan motion"
/content-machine "Weekly run: 3 statics + 2 carousels + 1 video script voor hero product"
```

### Test prompts — guardrail triggers

**Test 1: Activist taal (moet herschrijven)**
```
/content-ideator "Maak een krachtige post: 'Samen redden we de planeet! Stop met bomen kappen voor toiletpapier! Neem verantwoordelijkheid en kies bamboe!'"
```
**Verwacht**: systeem herkent triggers, herschrijft naar nuchter, rapporteert herschrijf.

**Test 2: Alleen eco claim (moet 2-van-3 aanvullen)**
```
/content-ideator "Schrijf een caption die alleen benadrukt dat het duurzaam is, niks anders"
```
**Verwacht**: systeem voegt waarde-regel of verspilling-regel toe.

**Test 3: Engels (moet bevestiging vragen of NL houden)**
```
/content-ideator "Write an English ad copy for international launch"
```
**Verwacht**: systeem blijft NL of vraagt expliciet om bevestiging.

**Test 4: False positive check (neutraal gebruik van trigger word)**
```
/content-ideator "Leg uit dat bamboe groeit zonder dat bomen worden gekapt"
```
**Verwacht**: systeem produceert nuchtere educatieve content, geen herschrijf.

**Test 5: Feitelijke claim (oké)**
```
/content-ideator "Onderstreep dat Bamboo Disposables boomvrij is en wat dat praktisch betekent"
```
**Verwacht**: feitelijk, met waarde-regel erbij, geen activist rewrite.

---

## Systeem 3 — Ad Management

### Test prompts
```
/ad-brief "Cold NL campagne, Ongebleekt 3L 48 rollen, comfort angle, targeting vrouwen 30-55"
/ad-machine "Draft test campaign 'Bamboo Hero Q2', 3 variants, dry run mode (geen upload)"
/media-buyer-agent "Status van lopende ads?"
/launch-ads "campaign 'test-draft' van paused naar active"
/bulk-ads-upload "Drie test statics naar Meta Ads Manager, paused"
```

### Mock ad insights voor performance loop test

Voor `bamboo-ad-performance-loop.json` testen zonder live Meta account:

```json
[
  {
    "ad_id": "mock_001",
    "ad_name": "MOCK Bamboo Ongebleekt 3L - Waarde Hook",
    "campaign_id": "camp_mock_001",
    "adset_id": "adset_mock_001",
    "spend": "25.00",
    "impressions": "4500",
    "clicks": "48",
    "ctr": "1.07",
    "cpc": "0.52",
    "purchase_roas": [{"action_type": "purchase", "value": "1.2"}],
    "actions": [{"action_type": "purchase", "value": "2"}]
  },
  {
    "ad_id": "mock_002",
    "ad_name": "MOCK Bamboo Ongebleekt 3L - Comfort Hook",
    "campaign_id": "camp_mock_001",
    "adset_id": "adset_mock_002",
    "spend": "55.00",
    "impressions": "18000",
    "clicks": "310",
    "ctr": "1.72",
    "cpc": "0.18",
    "purchase_roas": [{"action_type": "purchase", "value": "3.8"}],
    "actions": [{"action_type": "purchase", "value": "9"}]
  },
  {
    "ad_id": "mock_003",
    "ad_name": "MOCK Bamboo Blanc 3L - Generic",
    "campaign_id": "camp_mock_002",
    "adset_id": "adset_mock_003",
    "spend": "12.50",
    "impressions": "3800",
    "clicks": "14",
    "ctr": "0.37",
    "cpc": "0.89",
    "purchase_roas": [{"action_type": "purchase", "value": "1.8"}],
    "actions": [{"action_type": "purchase", "value": "1"}]
  },
  {
    "ad_id": "mock_004",
    "ad_name": "MOCK Bamboo Ongebleekt 2L - High CPC",
    "campaign_id": "camp_mock_003",
    "adset_id": "adset_mock_004",
    "spend": "30.00",
    "impressions": "2200",
    "clicks": "25",
    "ctr": "1.14",
    "cpc": "2.75",
    "purchase_roas": [{"action_type": "purchase", "value": "2.1"}],
    "actions": [{"action_type": "purchase", "value": "3"}]
  }
]
```

### Verwachte acties per mock ad

| ad_id | ROAS | Spend | CTR | CPC | Verwachte actie | Reden |
|-------|------|-------|-----|-----|-----------------|-------|
| mock_001 | 1.2 | 25 | 1.07 | 0.52 | **PAUSE** | ROAS 1.2 < 1.5, spend > 20 |
| mock_002 | 3.8 | 55 | 1.72 | 0.18 | **SCALE +20%** | ROAS 3.8 > 3.0, spend < 100 |
| mock_003 | 1.8 | 12 | 0.37 | 0.89 | **FLAG** | CTR 0.37% < 0.5% + impressions > 1000 |
| mock_004 | 2.1 | 30 | 1.14 | 2.75 | **PAUSE** | CPC 2.75 > 2.50 |

Als workflow deze 4 acties niet correct uitvoert → debug volgens `sops/09-ad-performance-loop-debug.md`.

---

## Integratie test scenarios

### Scenario A: Cross-systeem flow
```
1. /scrape-ads The Good Roll     # Systeem 1: scrape winner
2. /competitor-analyst "wat werkt deze week?"     # Identify winner angle
3. /content-ideator "recreate winner angle in Bamboo voice"     # Systeem 2: Bamboo versie
4. /generate-ad-statics "use concept van stap 3"     # Visual
5. /ad-brief "use visual + hook van stap 4"     # Systeem 3: brief
6. /ad-machine "draft campaign uit brief"     # Campaign structuur
```

Verwacht: elke stap bouwt op vorige. Tone blijft consistent (Bamboo brand voice). Geen activist language.

### Scenario B: Brand voice consistency

Run deze 5 prompts achter elkaar:
```
1. /content-ideator "Ongebleekt 3L waarde caption"
2. /ad-brief "comfort angle Blanc 3L"
3. /competitor-analyst "hook trends deze week"
4. /content-scripter "video script Ongebleekt 2L voorraad"
5. /script-ads "ad copy voor retargeting"
```

Check elke output:
- ✅ Nederlands
- ✅ "je/jij", geen "u"
- ✅ Minimaal 2-van-3 kernregels
- ✅ Geen activist taal
- ✅ Concrete getallen (vellen, rollen, equivalent)
- ✅ Hero product (Ongebleekt 3L) waar van toepassing

Als 5/5 pass → brand voice consistency OK.

---

## Test timing benchmarks

Voor performance benchmarks tijdens testing:

| Actie | Target tijd | Max acceptabel |
|-------|-------------|----------------|
| install.sh van scratch | 15 min | 30 min |
| claude login + eerste sessie | 1 min | 3 min |
| /scrape-ads 1 concurrent | 2 min | 5 min |
| /content-ideator 5 concepten | 30 sec | 90 sec |
| /generate-ad-statics 1 4K image | 30 sec | 2 min |
| /content-machine weekly run | 8 min | 15 min |
| /ad-machine draft campaign | 1 min | 3 min |
| n8n competitor-daily-scrape | 5 min | 15 min |
| n8n ad-performance-loop | 30 sec | 2 min |
| n8n weekly-digest | 2 min | 5 min |

Als iets structureel traag is → check MCP timeouts, Claude model selection (Opus vs Sonnet), API rate limits.
