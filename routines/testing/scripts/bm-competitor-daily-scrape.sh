#!/usr/bin/env bash
# Auto-extracted from: bm-competitor-daily-scrape.md
# 9 bash block(s)
set +e

# ==== Block 1/9 ====
curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Competitors?fields%5B%5D=name&fields%5B%5D=meta_page_id&fields%5B%5D=country&fields%5B%5D=niche" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/competitors.json

# ==== Block 2/9 ====
jq -r '.records[] | .fields | "\(.name)|\(.meta_page_id)|\(.country // "NL")|\(.niche // "")"' /tmp/competitors.json > /tmp/competitor_list.txt

# ==== Block 3/9 ====
mkdir -p /tmp/ad_scrapes

while IFS='|' read -r name page_id country niche; do
  echo "Scraping ads for: $name (page_id=$page_id, country=$country)"

  curl -sS -X POST "https://api.apify.com/v2/acts/apify~meta-ad-library-scraper/run-sync-get-dataset-items?token=$APIFY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"pageId\": \"$page_id\",
      \"country\": \"$country\",
      \"adActiveStatus\": \"active\",
      \"resultsLimit\": 50
    }" > "/tmp/ad_scrapes/${name// /_}.json"

  # Short pause to avoid rate limits
  sleep 2
done < /tmp/competitor_list.txt

# ==== Block 4/9 ====
# Paginate through all records to collect all ad_id's
OFFSET=""
> /tmp/existing_ad_ids.txt

while true; do
  URL="https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Competitor_Ads?fields%5B%5D=ad_id&pageSize=100"
  if [ -n "$OFFSET" ]; then
    URL="${URL}&offset=${OFFSET}"
  fi

  RESPONSE=$(curl -sS "$URL" -H "Authorization: Bearer $AIRTABLE_PAT")
  echo "$RESPONSE" | jq -r '.records[].fields.ad_id // empty' >> /tmp/existing_ad_ids.txt

  OFFSET=$(echo "$RESPONSE" | jq -r '.offset // empty')
  if [ -z "$OFFSET" ]; then
    break
  fi
done

echo "Existing ads in Airtable: $(wc -l < /tmp/existing_ad_ids.txt)"

# ==== Block 5/9 ====
> /tmp/new_ads.json
echo "[" > /tmp/new_ads.json

FIRST=true
for file in /tmp/ad_scrapes/*.json; do
  COMPETITOR=$(basename "$file" .json | tr '_' ' ')

  jq -c --arg comp "$COMPETITOR" '.[] | {
    competitor_name: $comp,
    ad_id: (.adArchiveID // .id // .adId),
    ad_text: (.snapshot.body.markup.__html // .bodyText // .adText // ""),
    ad_image_url: (.snapshot.images[0]?.original_image_url // .imageUrl // ""),
    ad_video_url: (.snapshot.videos[0]?.video_hd_url // .videoUrl // ""),
    start_date: (.startDate // .deliveryStartDate // ""),
    platform: (.publisherPlatform[0] // "facebook"),
    cta: (.snapshot.cta_text // .ctaText // ""),
    landing_page_url: (.snapshot.link_url // .linkUrl // ""),
    scrape_date: (now | strftime("%Y-%m-%d"))
  }' "$file" 2>/dev/null | while read -r ad; do
    AD_ID=$(echo "$ad" | jq -r '.ad_id')
    if ! grep -qF "$AD_ID" /tmp/existing_ad_ids.txt 2>/dev/null; then
      if [ "$FIRST" = true ]; then
        FIRST=false
      else
        echo ","
      fi
      echo "$ad"
    fi
  done
done >> /tmp/new_ads.json

echo "]" >> /tmp/new_ads.json

# Fix JSON formatting
jq '.' /tmp/new_ads.json > /tmp/new_ads_clean.json 2>/dev/null || echo "[]" > /tmp/new_ads_clean.json

NEW_COUNT=$(jq 'length' /tmp/new_ads_clean.json)
echo "New ads found: $NEW_COUNT"

# ==== Block 6/9 ====
TOTAL=$(jq 'length' /tmp/new_ads_clean.json)

if [ "$TOTAL" -eq 0 ]; then
  echo "No new ads — skip Airtable write"
else
  for ((i=0; i<TOTAL; i+=10)); do
    BATCH=$(jq --argjson start "$i" '[.[$start:$start+10][] | {fields: .}]' /tmp/new_ads_clean.json)

    curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Competitor_Ads" \
      -H "Authorization: Bearer $AIRTABLE_PAT" \
      -H "Content-Type: application/json" \
      -d "{\"records\": $BATCH}" > /tmp/airtable_response_$i.json

    # Check for errors
    if jq -e '.error' /tmp/airtable_response_$i.json > /dev/null 2>&1; then
      echo "[WARN] Airtable batch $i failed: $(jq -r '.error.message' /tmp/airtable_response_$i.json)"
    fi

    sleep 0.3
  done
fi

# ==== Block 7/9 ====
# Count per competitor
jq -r 'group_by(.competitor_name) | .[] | "\(.[0].competitor_name): \(length) new ads"' /tmp/new_ads_clean.json > /tmp/summary.txt

# Trends: most used CTAs, platforms
jq -r '[.[].cta] | group_by(.) | map({cta: .[0], count: length}) | sort_by(-.count) | .[0:3]' /tmp/new_ads_clean.json > /tmp/trends.json

# ==== Block 8/9 ====
DATE=$(date +%Y-%m-%d)
TOTAL_NEW=$(jq 'length' /tmp/new_ads_clean.json)
COMPETITOR_COUNT=$(jq '[.[].competitor_name] | unique | length' /tmp/new_ads_clean.json)
SUMMARY=$(cat /tmp/summary.txt)
TOP_CTAS=$(jq -r '.[] | "  \(.cta): \(.count)x"' /tmp/trends.json 2>/dev/null || echo "  no data")

MESSAGE=$(cat <<MSG
*Competitor Ad Scrape — $DATE*

*$TOTAL_NEW new ads* from $COMPETITOR_COUNT competitors

$SUMMARY

*Top CTAs:*
$TOP_CTAS

View all ads in Airtable (Competitor_Ads).
MSG
)

curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "parse_mode=Markdown" \
  --data-urlencode "text=$MESSAGE"

# ==== Block 9/9 ====
LOG_PAYLOAD=$(jq -n \
  --arg routine "competitor-daily-scrape" \
  --arg status "success" \
  --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson records "$TOTAL_NEW" \
  --arg summary "$TOTAL_NEW new ads from $COMPETITOR_COUNT competitors" \
  '{fields: {routine_name: $routine, status: $status, timestamp: $date, records_written: $records, summary: $summary}}')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Executions" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\": [$LOG_PAYLOAD]}"
