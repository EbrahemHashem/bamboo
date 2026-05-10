# SOP 04 — Apify Scraping Debug

**Gebruik wanneer:** Apify runs falen, geen data terug, of wrong data format voor Meta Ad Library scrapes.

---

## Stap 1: Test Apify token

```bash
curl "https://api.apify.com/v2/users/me?token=$APIFY_API_TOKEN"
```
Verwacht: JSON met user info + plan (free/starter/etc).

Als `401` → token fout. Genereer nieuwe op https://console.apify.com/settings/integrations.

---

## Stap 2: Check account credits

```bash
curl "https://api.apify.com/v2/users/me/usage/monthly?token=$APIFY_API_TOKEN" | python3 -m json.tool
```

Als credits bijna 0 → upgrade plan of top-up credit ($5 genoeg voor test).

Meta Ad Library scraper kost ~$0.50 per 1000 ads. Voor 4 concurrenten x 50 ads = $0.10 per run.

---

## Stap 3: Test scraper actor handmatig

Zoek de **juiste actor ID** — er zijn meerdere Meta Ad Library scrapers. Aanbevolen: `apify/meta-ad-library-scraper` of `curious_coder/facebook-ads-library-scraper`.

```bash
# List available actors
curl "https://api.apify.com/v2/acts?token=$APIFY_API_TOKEN&limit=100" \
  | python3 -c "import sys, json; data=json.load(sys.stdin); [print(a['username']+'/'+a['name']) for a in data['data']['items'] if 'meta' in a['name'].lower() or 'ad-library' in a['name'].lower()]"
```

Test run:
```bash
curl -X POST "https://api.apify.com/v2/acts/apify~meta-ad-library-scraper/runs?token=$APIFY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pageIds": ["PAGE_ID_OF_THE_GOOD_ROLL"],
    "countryCode": "NL",
    "adActiveStatus": "ACTIVE",
    "maxItems": 10
  }'
```

Verwacht: JSON met `runId`. Daarna:
```bash
curl "https://api.apify.com/v2/actor-runs/RUN_ID?token=$APIFY_API_TOKEN"
```
Wacht op `status: SUCCEEDED` (kan 30-60 sec duren).

Daarna:
```bash
curl "https://api.apify.com/v2/datasets/DATASET_ID/items?token=$APIFY_API_TOKEN&limit=5" \
  | python3 -m json.tool
```
Verwacht: array van ad objects.

---

## Stap 4: Facebook Page ID vinden voor concurrent

**Dit is de #1 reden dat scrapes mislukken** — Page ID ≠ Profile ID ≠ username!

Voor Meta Ad Library: je hebt de **Ad Library Page ID** nodig.

### Methode 1: Via Meta Ad Library zoeken
1. Ga naar https://www.facebook.com/ads/library/
2. Zoek op concurrent naam (bijv "The Good Roll")
3. Klik op de juiste pagina
4. URL wordt `.../ads/library/?view_all_page_id=XXXXXXXX` — die XXXXXXXX is de page ID
5. Kopieer naar `competitors.json` + Airtable Competitors table

### Methode 2: Via Graph API
```bash
curl "https://graph.facebook.com/v19.0/search?q=The%20Good%20Roll&type=page&access_token=$META_ACCESS_TOKEN" | python3 -m json.tool
```

### Bamboo concurrenten Page IDs (placeholder — te verifiëren door dev)
- The Good Roll: _NOG INVULLEN_
- Bamboi: _NOG INVULLEN_
- The Cheeky Panda: _NOG INVULLEN_
- Who Gives A Crap: _NOG INVULLEN_

**Developer taak**: vul alle 4 Page IDs in `competitors.json` + Airtable tijdens fase C van test plan.

---

## Stap 5: Scraper retourneert leeg dataset

Mogelijke oorzaken:
1. **Concurrent heeft geen actieve ads in NL** → probeer `countryCode: "ALL"` of andere markt
2. **Page ID fout** → zie stap 4
3. **Actor is outdated** → Apify actors breken soms als Meta de Ad Library API wijzigt. Update naar latest versie van de actor
4. **Rate limit Apify** → wacht 5 min, probeer opnieuw

Test met een bekend actief merk (bijv Nike) om te checken of actor zelf werkt:
```bash
# Nike page ID: 15087023444
```

---

## Stap 6: Partial data / missing fields

Als ads wel binnenkomen maar velden missen (geen `body_text`, geen `video_url`):

- Check welke velden de actor retourneert in zijn schema op Apify
- Sommige actors retourneren alleen `snapshot.body.text`, geen `body_text`
- De skill `scrape-ads.md` verwacht bepaalde velden — je moet de field mapping aanpassen

In `scrape-ads.md`, zoek naar:
```
const bodyText = ad.body_text || ad.snapshot?.body?.text || '';
```
Voeg fallbacks toe voor nieuwe actor field names.

---

## Stap 7: Video transcription fail

Als Whisper/ffmpeg niet geïnstalleerd zijn → skill logt warning en skipt transcription (geen blocker).

Handmatig installeren:
```bash
brew install ffmpeg
pip3 install openai-whisper
```

Test:
```bash
ffmpeg -version
whisper --help
```

---

## Stap 8: Apify scraper alternatives

Als `apify~meta-ad-library-scraper` broken is, alternatieven:
- `curious_coder/facebook-ads-library-scraper`
- `clockworks/free-meta-ad-library-scraper`
- Custom actor schrijven (laatste redmiddel)

Swap in `competitors.json` + n8n workflow + `scrape-ads.md` skill.

---

## Veelvoorkomende issues

| Symptoom | Oorzaak | Fix |
|----------|---------|-----|
| Empty dataset | Geen actieve ads in country | Check live ads in Meta Ad Library UI |
| Run timeout | maxItems te hoog | Lower naar 25-50 |
| Invalid page ID | Profile ID gebruikt ipv Page ID | Zie stap 4 |
| 402 Payment Required | Apify credits op | Top-up |
| Missing body_text | Actor schema changed | Update field mapping in skill |
| Rate limit | Te veel parallelle runs | Wacht + sequential runs |
| Whisper not found | Optional deps missing | `brew install ffmpeg; pip3 install openai-whisper` |
