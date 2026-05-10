# Bamboo Ad Research — Airtable Schema

Base naam: **Bamboo Ad Research**

Nathan moet deze base eenmalig aanmaken (of install script doet het via Airtable API). Hieronder de schema specs.

---

## Table 1: Competitors (pre-fill bij install)

| Field | Type | Voorbeeld |
|-------|------|-----------|
| Name | singleLineText | The Good Roll |
| Status | singleSelect | Active / Paused |
| Priority | singleSelect | High / Medium / Low |
| Facebook Page ID | singleLineText | (Meta Ad Library page ID — niet profile ID) |
| Instagram Handle | singleLineText | @thegoodroll |
| Website | url | https://www.thegoodroll.com |
| Niche | singleLineText | Duurzaam bamboe toiletpapier |
| Positioning | longText | Morele impact & sociaal verhaal... |
| Bamboo Edge | longText | Waar Bamboo kan winnen... |
| Live Ads Count | number | (auto-updated door scrape) |
| Last Scrape Date | date | (auto-updated door scrape) |
| Scrape Frequency | singleSelect | daily / weekly / paused |

**Pre-fill 4 rows** uit `~/projects/mac-mini-builds/bamboo/competitors.json`.

---

## Table 2: Ad Research (wordt gevuld door scrape)

### Core fields
| Field | Type |
|-------|------|
| Ad Archive ID | singleLineText (primary) |
| Page Name | singleLineText |
| Page ID | singleLineText |
| Competitor | multipleRecordLinks (→ Competitors) |
| Ad Library URL | url |
| Start Date | date |
| End Date | date |
| Is Active | checkbox |
| Days Live | formula (`DATETIME_DIFF(TODAY(), {Start Date}, 'days')`) |
| Platforms | multipleSelects (Facebook, Instagram, Messenger, AN) |
| Display Format | singleSelect (Video, Image, Carousel, DCO) |
| Scrape Date | date |
| Scrape Batch ID | singleLineText |

### Copy & classificatie fields
| Field | Type |
|-------|------|
| Body Text | longText |
| Headline | longText |
| CTA Button | singleSelect |
| Landing Page URL | url |
| Hook | longText |
| Hook Type | singleSelect (Question, Pattern Interrupt, Stat, Comparison, Story) |
| Angle Category | singleSelect (Waarde, Comfort, Duurzaam, Voorraadrust, Other) |
| Awareness Stage | singleSelect (Unaware, Problem Aware, Solution Aware, Product Aware, Most Aware) |
| Emotion Trigger | singleSelect |
| Mechanism Used | singleLineText |

### Video fields (bij video ads)
| Field | Type |
|-------|------|
| Video URL | url |
| Transcript | longText |
| Words Per Second | number |
| Pacing | singleSelect (Slow, Medium, Fast) |

### Performance fields
| Field | Type |
|-------|------|
| Impressions Range | singleLineText |
| Is Winner | checkbox (formula: Days Live > 14 AND Impressions hoog) |
| Winner Status | singleSelect (New, Rising, Winner, Refresh, Dying) |

### Bamboo-specifieke velden
| Field | Type |
|-------|------|
| Bamboo Angle Match | singleSelect (Waarde, Comfort, Duurzaam, Voorraadrust) |
| Bamboo Recreate Priority | singleSelect (High, Medium, Low, Skip) |
| Bamboo Adaptation Notes | longText |

---

## Table 3: Weekly Digest (archief)

| Field | Type |
|-------|------|
| Week | number |
| Year | number |
| Date | date |
| Content | longText (markdown) |
| Ad Count | number |
| Winners Count | number |
| New Launches | number |
| Top Angle | singleSelect |

---

## Views per tabel

### Ad Research views
- **Active Winners**: `Is Winner = checked AND Is Active = checked`, sorted by Days Live desc
- **Nieuwe launches**: `DATETIME_DIFF(TODAY(), {Start Date}, 'days') < 7`, sorted by Start Date desc
- **Per concurrent** (gegroepeerd by Competitor)
- **Bamboo Recreate Queue**: `Bamboo Recreate Priority = High`, sorted by Days Live desc

### Competitors views
- **Active**: Status = Active

---

## Install volgorde

1. Nathan logt in Airtable en maakt lege base "Bamboo Ad Research"
2. Install script vraagt om Airtable PAT + base ID
3. Install script maakt via API de 3 tabellen + schema
4. Install script pre-fillt Competitors tabel uit `competitors.json`
5. Test: `/scrape-ads The Good Roll` → moet rows toevoegen aan Ad Research
