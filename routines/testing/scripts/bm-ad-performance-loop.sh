#!/usr/bin/env bash
# Auto-extracted from: bm-ad-performance-loop.md
# 9 bash block(s)
set +e

# ==== Block 1/9 ====
curl -sS "https://graph.facebook.com/v19.0/$META_AD_ACCOUNT_ID/insights" \
  -d "access_token=$META_ACCESS_TOKEN" \
  -d "level=ad" \
  -d "date_preset=today" \
  -d "fields=campaign_name,adset_name,ad_name,ad_id,spend,impressions,clicks,actions,cost_per_action_type,purchase_roas" \
  -d "limit=500" \
  -d "filtering=[{\"field\":\"ad.effective_status\",\"operator\":\"IN\",\"value\":[\"ACTIVE\"]}]" \
  > /tmp/ads_insights_raw.json

# ==== Block 2/9 ====
if jq -e '.error' /tmp/ads_insights_raw.json > /dev/null 2>&1; then
  ERROR_MSG=$(jq -r '.error.message' /tmp/ads_insights_raw.json)
  echo "[ERROR] Meta API error: $ERROR_MSG"

  curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "parse_mode=Markdown" \
    --data-urlencode "text=Ad Performance Loop FAIL: $ERROR_MSG"

  exit 1
fi

# ==== Block 3/9 ====
jq '[.data[] | {
  ad_id: .ad_id,
  ad_name: .ad_name,
  campaign_name: .campaign_name,
  adset_name: .adset_name,
  spend: (.spend | tonumber),
  impressions: (.impressions | tonumber),
  clicks: (.clicks | tonumber),
  conversions: ([.actions[]? | select(.action_type=="purchase" or .action_type=="offsite_conversion.fb_pixel_purchase") | .value | tonumber] | add // 0),
  cpa: ([.cost_per_action_type[]? | select(.action_type=="purchase" or .action_type=="offsite_conversion.fb_pixel_purchase") | .value | tonumber] | first // 0),
  roas: ([.purchase_roas[]? | .value | tonumber] | first // 0),
  ctr: (if (.impressions | tonumber) > 0 then ((.clicks | tonumber) / (.impressions | tonumber) * 100) else 0 end)
}]' /tmp/ads_insights_raw.json > /tmp/ads_parsed.json

AD_COUNT=$(jq 'length' /tmp/ads_parsed.json)
echo "Ads fetched: $AD_COUNT"

# ==== Block 4/9 ====
MAX_CPA=${MAX_CPA:-30}
BUDGET_CAP=${BUDGET_CAP:-500}

jq --argjson max_cpa "$MAX_CPA" --argjson budget_cap "$BUDGET_CAP" '[.[] | {
  ad_id: .ad_id,
  ad_name: .ad_name,
  spend: .spend,
  roas: .roas,
  cpa: .cpa,
  ctr: .ctr,
  action: (
    if .roas < 1.5 and .spend > 20 then "PAUSE"
    elif .cpa > $max_cpa and .cpa > 0 then "PAUSE"
    elif .roas > 3 and .spend < $budget_cap then "SCALE"
    elif .ctr < 0.5 and .impressions > 1000 then "FLAG"
    else "KEEP"
    end
  ),
  reason: (
    if .roas < 1.5 and .spend > 20 then "ROAS \(.roas) < 1.5, spend \(.spend)"
    elif .cpa > $max_cpa and .cpa > 0 then "CPA \(.cpa) > max \($max_cpa)"
    elif .roas > 3 and .spend < $budget_cap then "ROAS \(.roas) > 3, room to scale"
    elif .ctr < 0.5 and .impressions > 1000 then "CTR \(.ctr)% < 0.5%, creative refresh"
    else "Performance OK"
    end
  )
}]' /tmp/ads_parsed.json > /tmp/decisions.json

# Count
PAUSE_COUNT=$(jq '[.[] | select(.action=="PAUSE")] | length' /tmp/decisions.json)
SCALE_COUNT=$(jq '[.[] | select(.action=="SCALE")] | length' /tmp/decisions.json)
FLAG_COUNT=$(jq '[.[] | select(.action=="FLAG")] | length' /tmp/decisions.json)
KEEP_COUNT=$(jq '[.[] | select(.action=="KEEP")] | length' /tmp/decisions.json)

echo "Decisions: PAUSE=$PAUSE_COUNT, SCALE=$SCALE_COUNT, FLAG=$FLAG_COUNT, KEEP=$KEEP_COUNT"

# ==== Block 5/9 ====
jq -r '.[] | select(.action=="PAUSE") | .ad_id' /tmp/decisions.json | while read -r AD_ID; do
  echo "PAUSING ad: $AD_ID"
  curl -sS -X POST "https://graph.facebook.com/v19.0/$AD_ID" \
    -d "access_token=$META_ACCESS_TOKEN" \
    -d "status=PAUSED" > /tmp/pause_response.json

  if jq -e '.error' /tmp/pause_response.json > /dev/null 2>&1; then
    echo "[WARN] Pause failed for $AD_ID: $(jq -r '.error.message' /tmp/pause_response.json)"
  fi

  sleep 0.5
done

# ==== Block 6/9 ====
jq -r '.[] | select(.action=="SCALE") | .ad_id' /tmp/decisions.json | while read -r AD_ID; do
  echo "SCALING ad: $AD_ID"

  # Fetch current adset for budget
  ADSET_ID=$(curl -sS "https://graph.facebook.com/v19.0/$AD_ID?fields=adset_id&access_token=$META_ACCESS_TOKEN" | jq -r '.adset_id')

  CURRENT_BUDGET=$(curl -sS "https://graph.facebook.com/v19.0/$ADSET_ID?fields=daily_budget&access_token=$META_ACCESS_TOKEN" | jq -r '.daily_budget')

  if [ -n "$CURRENT_BUDGET" ] && [ "$CURRENT_BUDGET" != "null" ]; then
    NEW_BUDGET=$(echo "$CURRENT_BUDGET * 1.2" | bc | cut -d. -f1)

    curl -sS -X POST "https://graph.facebook.com/v19.0/$ADSET_ID" \
      -d "access_token=$META_ACCESS_TOKEN" \
      -d "daily_budget=$NEW_BUDGET" > /tmp/scale_response.json

    if jq -e '.error' /tmp/scale_response.json > /dev/null 2>&1; then
      echo "[WARN] Scale failed for adset $ADSET_ID: $(jq -r '.error.message' /tmp/scale_response.json)"
    else
      echo "Scaled $ADSET_ID: $CURRENT_BUDGET -> $NEW_BUDGET"
    fi
  fi

  sleep 0.5
done

# ==== Block 7/9 ====
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

jq --arg ts "$TIMESTAMP" '[.[] | select(.action != "KEEP") | {fields: {
  timestamp: $ts,
  ad_name: .ad_name,
  ad_id: .ad_id,
  action: .action,
  reason: .reason,
  roas: .roas,
  cpa: .cpa,
  spend: .spend,
  new_status: (if .action == "PAUSE" then "PAUSED" elif .action == "SCALE" then "SCALED +20%" else "FLAGGED")
}}]' /tmp/decisions.json > /tmp/log_records.json

TOTAL_LOGS=$(jq 'length' /tmp/log_records.json)

if [ "$TOTAL_LOGS" -gt 0 ]; then
  for ((i=0; i<TOTAL_LOGS; i+=10)); do
    BATCH=$(jq --argjson start "$i" '.[$start:$start+10]' /tmp/log_records.json)

    curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Ad_Decisions_Log" \
      -H "Authorization: Bearer $AIRTABLE_PAT" \
      -H "Content-Type: application/json" \
      -d "{\"records\": $BATCH}" > /tmp/log_response_$i.json

    if jq -e '.error' /tmp/log_response_$i.json > /dev/null 2>&1; then
      echo "[WARN] Airtable log batch $i failed: $(jq -r '.error.message' /tmp/log_response_$i.json)"
    fi

    sleep 0.3
  done
fi

# ==== Block 8/9 ====
DATE=$(date +%Y-%m-%d)
TIME=$(TZ=Europe/Amsterdam date +%H:%M)

# Build detail lists
PAUSED_LIST=$(jq -r '.[] | select(.action=="PAUSE") | "  \(.ad_name) — \(.reason)"' /tmp/decisions.json)
SCALED_LIST=$(jq -r '.[] | select(.action=="SCALE") | "  \(.ad_name) — \(.reason)"' /tmp/decisions.json)
FLAGGED_LIST=$(jq -r '.[] | select(.action=="FLAG") | "  \(.ad_name) — \(.reason)"' /tmp/decisions.json)

MESSAGE=$(cat <<MSG
*Ad Performance Loop — $DATE $TIME*

*$AD_COUNT ads analyzed*

*PAUSED ($PAUSE_COUNT):*
${PAUSED_LIST:-"  none"}

*SCALED +20% ($SCALE_COUNT):*
${SCALED_LIST:-"  none"}

*FLAGGED for creative refresh ($FLAG_COUNT):*
${FLAGGED_LIST:-"  none"}

*OK ($KEEP_COUNT):* no action needed
MSG
)

curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "parse_mode=Markdown" \
  --data-urlencode "text=$MESSAGE"

# ==== Block 9/9 ====
LOG_PAYLOAD=$(jq -n \
  --arg routine "ad-performance-loop" \
  --arg status "success" \
  --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson records "$TOTAL_LOGS" \
  --arg summary "PAUSE=$PAUSE_COUNT, SCALE=$SCALE_COUNT, FLAG=$FLAG_COUNT, KEEP=$KEEP_COUNT" \
  '{fields: {routine_name: $routine, status: $status, timestamp: $date, records_written: $records, summary: $summary}}')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Executions" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\": [$LOG_PAYLOAD]}"
