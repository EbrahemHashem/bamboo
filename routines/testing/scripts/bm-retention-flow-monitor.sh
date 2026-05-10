#!/usr/bin/env bash
# Auto-extracted from: bm-retention-flow-monitor.md
# 5 bash block(s)
set +e

# ==== Block 1/5 ====
# List flows
curl -sS "https://a.klaviyo.com/api/flows/?page[size]=50" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "accept: application/vnd.api+json" \
  -H "revision: 2024-10-15" > /tmp/flows.json

FLOW_COUNT=$(jq '.data | length' /tmp/flows.json)
echo "Total flows: $FLOW_COUNT"

# ==== Block 2/5 ====
> /tmp/flow_health.jsonl
CRITICAL=0

jq -c '.data[]' /tmp/flows.json | while read -r flow; do
  FLOW_ID=$(echo "$flow" | jq -r '.id')
  FLOW_NAME=$(echo "$flow" | jq -r '.attributes.name // "unnamed"')
  STATUS=$(echo "$flow" | jq -r '.attributes.status // ""')

  # Skip drafts/archived
  [ "$STATUS" != "live" ] && continue

  # Aggregated metrics via Klaviyo query_flow_values
  NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  LAST7=$(date -u -d "7 days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-7d +%Y-%m-%dT%H:%M:%SZ)
  PRIOR7=$(date -u -d "14 days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-14d +%Y-%m-%dT%H:%M:%SZ)

  QUERY7=$(jq -n --arg id "$FLOW_ID" --arg start "$LAST7" --arg end "$NOW" '{
    data: {
      type: "flow-values-report",
      attributes: {
        statistics: ["opens", "opens_unique", "clicks", "clicks_unique", "conversions", "conversion_value", "unsubscribes", "recipients"],
        timeframe: {start: $start, end: $end},
        conversion_metric_id: "placeholder",
        filter: ("equals(flow_id,\"" + $id + "\")")
      }
    }
  }')

  METRICS=$(curl -sS -X POST "https://a.klaviyo.com/api/flow-values-reports/" \
    -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
    -H "accept: application/vnd.api+json" \
    -H "revision: 2024-10-15" \
    -H "Content-Type: application/json" \
    -d "$QUERY7")

  SENDS=$(echo "$METRICS" | jq '[.data.attributes.results[]?.statistics.recipients // 0] | add // 0')
  OPENS=$(echo "$METRICS" | jq '[.data.attributes.results[]?.statistics.opens_unique // 0] | add // 0')
  CLICKS=$(echo "$METRICS" | jq '[.data.attributes.results[]?.statistics.clicks_unique // 0] | add // 0')
  UNSUB=$(echo "$METRICS" | jq '[.data.attributes.results[]?.statistics.unsubscribes // 0] | add // 0')
  REVENUE=$(echo "$METRICS" | jq '[.data.attributes.results[]?.statistics.conversion_value // 0] | add // 0')

  # Rates
  OPEN_RATE=$(echo "scale=4; $OPENS / ($SENDS + 0.001) * 100" | bc 2>/dev/null || echo "0")
  CLICK_RATE=$(echo "scale=4; $CLICKS / ($SENDS + 0.001) * 100" | bc 2>/dev/null || echo "0")
  UNSUB_RATE=$(echo "scale=4; $UNSUB / ($SENDS + 0.001) * 100" | bc 2>/dev/null || echo "0")

  # Flag critical
  HEALTH="OK"
  if (( $(echo "$OPEN_RATE < 20" | bc -l) )); then
    HEALTH="Critical — low open rate"
    CRITICAL=$((CRITICAL + 1))
  elif (( $(echo "$UNSUB_RATE > 1" | bc -l) )); then
    HEALTH="Critical — high unsubscribe"
    CRITICAL=$((CRITICAL + 1))
  fi

  # Upsert Email_Performance
  UPSERT=$(jq -n --arg n "$FLOW_NAME" --arg id "$FLOW_ID" \
    --argjson sends "$SENDS" --arg or "$OPEN_RATE" --arg cr "$CLICK_RATE" \
    --arg unsub "$UNSUB_RATE" --argjson rev "$REVENUE" --arg h "$HEALTH" '{
    fields: {
      flow_name: $n,
      flow_id: $id,
      sends_7d: $sends,
      open_rate_pct: ($or | tonumber),
      click_rate_pct: ($cr | tonumber),
      unsubscribe_rate_pct: ($unsub | tonumber),
      revenue_7d: $rev,
      health: $h,
      measured_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
    }
  }')

  curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Email_Performance" \
    -H "Authorization: Bearer $AIRTABLE_PAT" \
    -H "Content-Type: application/json" \
    -d "{\"records\":[$UPSERT]}" > /dev/null

  echo "{\"flow\":\"$FLOW_NAME\",\"open\":$OPEN_RATE,\"health\":\"$HEALTH\"}" >> /tmp/flow_health.jsonl
done

TOTAL=$(wc -l < /tmp/flow_health.jsonl 2>/dev/null || echo 0)
echo "Flows checked: $TOTAL, critical: $CRITICAL"

# ==== Block 3/5 ====
if [ "$CRITICAL" -gt 0 ]; then
  MSG="📉 *Klaviyo flow alert (Bamboo)*%0A"
  while IFS= read -r line; do
    HEALTH=$(echo "$line" | jq -r '.health')
    if echo "$HEALTH" | grep -q "Critical"; then
      F=$(echo "$line" | jq -r '.flow')
      OR=$(echo "$line" | jq -r '.open')
      MSG="${MSG}• *${F}* → ${HEALTH} (open ${OR}%%)%0A"
    fi
  done < /tmp/flow_health.jsonl

  curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "parse_mode=Markdown" \
    --data-urlencode "text=$MSG"
fi

# ==== Block 4/5 ====
LOG=$(jq -n --argjson total "$TOTAL" --argjson crit "$CRITICAL" '{
  fields: {
    routine_name: "bm-retention-flow-monitor",
    status: (if $crit > 0 then "partial" else "success" end),
    records_written: $total,
    summary: ($total | tostring + " flows checked, " + ($crit | tostring) + " critical"),
    timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  }
}')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/BM_Executions" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[$LOG]}"

# ==== Block 5/5 ====
# [SKIPPED slash-command] /bm-retention-flow-monitor
