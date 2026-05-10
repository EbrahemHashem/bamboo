---
name: bm-ad-performance-loop
cron: "0 */4 * * *"
timezone: Europe/Amsterdam
mcps: [airtable]
owner: bamboo
status: draft
category: core
origin: ad-performance-loop.json
---

# Ad Performance Loop

Every 4 hours, pull Meta Ads performance data, apply automatic rules (pause, scale, flag), execute the decisions via the Meta API, and log everything to Airtable + Telegram. Fully hands-off ad management.

**Execute these steps strictly in order. Use Bash for all HTTP calls with curl.**

---

## Environment Variables

- `META_AD_ACCOUNT_ID` — Meta Ads account ID (format: `act_123456789`)
- `META_ACCESS_TOKEN` — Meta Graph API token (long-lived token)
- `AIRTABLE_PAT` — Airtable Personal Access Token
- `AIRTABLE_BASE_ID` — client base ID
- `TELEGRAM_BOT_TOKEN` — Telegram bot for notifications
- `TELEGRAM_CHAT_ID` — chat ID for alerts

Check with `env | grep -E "META|AIRTABLE|TELEGRAM"` before starting. If anything is missing, stop and report.

---

## 1. Pull Meta Ads insights

Fetch today's performance data for all active ads:

```bash
curl -sS "https://graph.facebook.com/v19.0/$META_AD_ACCOUNT_ID/insights" \
  -d "access_token=$META_ACCESS_TOKEN" \
  -d "level=ad" \
  -d "date_preset=today" \
  -d "fields=campaign_name,adset_name,ad_name,ad_id,spend,impressions,clicks,actions,cost_per_action_type,purchase_roas" \
  -d "limit=500" \
  -d "filtering=[{\"field\":\"ad.effective_status\",\"operator\":\"IN\",\"value\":[\"ACTIVE\"]}]" \
  > /tmp/ads_insights_raw.json
```

Check if the response is valid:
```bash
if jq -e '.error' /tmp/ads_insights_raw.json > /dev/null 2>&1; then
  ERROR_MSG=$(jq -r '.error.message' /tmp/ads_insights_raw.json)
  echo "[ERROR] Meta API error: $ERROR_MSG"

  curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "parse_mode=Markdown" \
    --data-urlencode "text=Ad Performance Loop FAIL: $ERROR_MSG"

  exit 1
fi
```

Parse to usable format:
```bash
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
```

---

## 2. Apply performance rules

Evaluate each ad against the rules. The routine IS Claude, so analyze the data directly.

**Rules:**

| Condition | Action | Reason |
|-----------|--------|--------|
| ROAS < 1.5 AND spend > 20 | PAUSE | Unprofitable, enough data |
| ROAS > 3 AND spend < budget_cap | SCALE +20% | Winner, room to scale |
| CPA > max_cpa (default: 30) | PAUSE | Too expensive per conversion |
| CTR < 0.5% | FLAG | Creative refresh needed |

Generate decisions per ad:

```bash
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
```

---

## 3. Execute decisions via Meta API

### Pause unprofitable ads

```bash
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
```

### Scale winners (+20% budget)

```bash
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
```

---

## 4. Log decisions to Airtable

Write all decisions (except KEEP) to `Ad_Decisions_Log`:

```bash
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
```

---

## 5. Send Telegram summary

```bash
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
```

---

## 6. Call _routine-logger

```bash
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
```

---

## Error handling

- Meta API auth error (190, 102): stop, send Telegram alert — token needs to be renewed
- Meta API rate limit: wait 60s, retry 1x
- Any ad that cannot be paused/scaled: log `[WARN]`, continue with the rest
- If Airtable fails: stop, send error Telegram
- If Telegram fails: log, exit with exit 0 (Airtable already has the data)
- NEVER increase budget by more than 20% at once (hardcoded limit)

---

## Verification report (final output)

```json
{
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "routine": "ad-performance-loop",
  "ads_analyzed": 0,
  "paused": 0,
  "scaled": 0,
  "flagged": 0,
  "kept": 0,
  "airtable_logs_written": 0,
  "telegram_sent": true,
  "execution_logged": true,
  "warnings": []
}
```
