---
name: b2b-prospector
description: Vind B2B target companies voor Bamboo via Apify (Google Maps scraper, LinkedIn, Kamer van Koophandel). Verrijk met Hunter.io of mock email discovery. Output = pre-filled rows in Airtable B2B Leads tabel. Input = sector + regio + size query.
---

# /b2b-prospector — Bamboo B2B Prospector

Je taak: doelgerichte B2B leadlijsten bouwen voor kantoren, scholen, wellness, hospitality. Output gaat direct naar Airtable zodat `/b2b-outreach` het kan oppakken.

## Voorbeelden

```
/b2b-prospector "kantoren Amsterdam 20-50 medewerkers"
/b2b-prospector "yoga studios Utrecht"
/b2b-prospector "boutique hotels Amsterdam centrum 10-30 kamers"
/b2b-prospector "basisscholen Haarlem"
```

---

## Prerequisites

1. **Apify MCP** (`mcp__apify__*`) — voor Google Maps scraper + LinkedIn + web scraping
2. **Airtable MCP** — B2B Leads tabel
3. **Hunter.io API** (optioneel) of mock email discovery
4. **b2b-target-groups.md** gelezen voor sector context

---

## Workflow

### Stap 1 — Ontleed query

Extract:
- **Sector** → mappen naar Airtable enum (Kantoor / School / Wellness / Hospitality / Sport / Retail / Anders)
- **Regio** (stad/provincie)
- **Size filter** (medewerkers, kamers, etc.)
- **Specifieke keywords** (yoga, kantoor, etc.)

Mapping helper:
| Query termen | Sector enum | Apify actor |
|--------------|-------------|-------------|
| kantoor, office, bureau | Kantoor | google-maps-scraper + LinkedIn |
| school, onderwijs, bso, kinderopvang | School | google-maps-scraper |
| yoga, sauna, massage, wellness, salon, spa | Wellness | google-maps-scraper + Instagram |
| hotel, b&b, vakantiepark, glamping | Hospitality | google-maps-scraper + Booking |
| sport, gym, fitness, studio | Sport | google-maps-scraper |
| retail, winkel, shop | Retail | google-maps-scraper |

### Stap 2 — Scrape met Apify

Gebruik `mcp__apify__call-actor`:

```
actor: "compass/google-maps-scraper"
input: {
  "searchStringsArray": [ "{{ sector keyword }} {{ regio }}" ],
  "maxCrawledPlacesPerSearch": 30,
  "language": "nl",
  "countryCode": "nl",
  "exportPlaceUrls": true
}
```

Verzamel per place:
- `title` → Company Name
- `address`, `city`, `postalCode`
- `website`, `phone`
- `categoryName` → sector verificatie
- `totalScore`, `reviewsCount` (voor priority sort)
- Voor hotels: `permanentlyClosed = false` check

### Stap 3 — Filter op size (indien relevant)

Voor kantoren: als website beschikbaar, doe een quick fetch op `/over-ons` of LinkedIn om medewerker aantal te schatten. Als niet beschikbaar → tag als "Unknown Size" en behoud.

Voor scholen: aantal leerlingen uit schoolwebsite of DUO register (optioneel).

Voor hotels: aantal kamers uit Booking.com URL of eigen site.

### Stap 4 — Email discovery

Voor elke company:
1. Check of website bestaat
2. Gebruik Hunter.io API (indien key beschikbaar):
   ```
   GET https://api.hunter.io/v2/domain-search?domain={{ domain }}&api_key={{ key }}
   ```
   → pak meest waarschijnlijke contact (office manager, owner, facility, HR)
3. Fallback: raad `info@{{ domain }}` en `contact@{{ domain }}` aan

Als geen email vindbaar: flag voor handmatige research, maar behoud row (phone/LinkedIn kan Nathan nog gebruiken).

### Stap 5 — Bereken Estimated Volume + Monthly Value

| Sector + grootte | Est. Volume | Est. Monthly Value |
|------------------|-------------|---------------------|
| Kantoor 10-20 mw | 48 of 96 | €60-€150 |
| Kantoor 20-50 mw | 96 | €150-€400 |
| School basis 200+ | 96 | €200-€400 |
| BSO/kinderopvang | 48 of 96 | €80-€200 |
| Wellness klein | 48 | €40-€100 |
| Wellness midden | 96 | €100-€250 |
| Hotel <15 kamers | 96 | €80-€250 |
| Hotel 15-40 kamers | 96 (bulk) | €250-€800 |

(Zie `b2b-target-groups.md` voor volledige range.)

### Stap 6 — Write naar Airtable

Per lead:

```
mcp__airtable__create_record
  table: "B2B Leads"
  fields: {
    "Lead ID": "B2B-{{ timestamp }}-{{ slug(company_name) }}",
    "Company Name": "...",
    "Sector": "{{ enum }}",
    "Contact Name": "{{ name or "Nog onbekend" }}",
    "Contact Email": "{{ email }}",
    "Contact Phone": "{{ phone }}",
    "Source": "Outbound",
    "Stage": "New",
    "Interest Level": "Unknown",
    "Estimated Volume": "{{ 48 / 96 / Bulk }}",
    "Estimated Monthly Value": X,
    "Notes": "{{ source URL, review count, sector details }}",
    "Outreach Messages": 0
  }
```

Dedupe: check of Company Name al bestaat → skip of mark als "Duplicate skip".

---

## Output aan Nathan

```
B2B Prospecting — {{ query }}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sector:         {{ sector }}
Regio:          {{ regio }}
Gevonden:       {{ n_total }} companies
Dedupe skipped: {{ n_dupes }}
Nieuwe leads:   {{ n_new }}

Met email:      {{ n_with_email }}
Zonder email:   {{ n_no_email }} (handmatig aanvullen)

Estimated pipeline value:
  Conservative: €{{ low }}/mnd
  Aggressive:   €{{ high }}/mnd

Volgende stap: /b2b-outreach draaien per lead, of bulk via /respond-to-leads
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Top 5 leads (op rating × size):
  1. {{ company1 }} — {{ sector }} — €{{ est }}/mnd
  2. {{ company2 }} — ...
```

---

## Error handling

- Apify actor geen resultaten → probeer bredere query ("kantoren Noord-Holland" ipv "kantoren Amsterdam Oost")
- Hunter.io geen key → gebruik `info@domain` fallback, flag lead als "Email unverified"
- Airtable duplicate key → gebruik `Lead ID` met timestamp suffix
- Apify rate limit → batch 10 places per run

## Gebruik

Handmatig, meestal 1-2x per week. Nathan runt `/b2b-prospector "kantoren Amsterdam"` → 30 leads → runt `/b2b-outreach` per lead of in bulk.
