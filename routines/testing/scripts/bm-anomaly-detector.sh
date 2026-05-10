#!/usr/bin/env bash
# Auto-extracted from: bm-anomaly-detector.md
# 6 bash block(s)
set +e

# ==== Block 1/6 ====
CUTOFF=$(date -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d)

curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Daily_KPIs?filterByFormula=IS_AFTER(%7BDate%7D%2C%27$CUTOFF%27)&pageSize=20" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/daily_kpis.json

KPI_COUNT=$(jq '.records | length' /tmp/daily_kpis.json)
echo "KPI records (7d): $KPI_COUNT"

if [ "$KPI_COUNT" -lt 3 ]; then
  echo "[EMPTY] Not enough baseline data (<3 days)"
  exit 0
fi

# ==== Block 2/6 ====
# Average + today
jq '{
  baseline_cpa: ([.records[].fields.CPA // 0] | add / length),
  baseline_cr: ([.records[].fields.CR // 0] | add / length),
  baseline_email_rev: ([.records[].fields.Email_Revenue // 0] | add / length),
  baseline_total_rev: ([.records[].fields.Total_Revenue // 0] | add / length),
  baseline_ad_spend: ([.records[].fields.Ad_Spend // 0] | add / length),
  today_cpa: ([.records[] | select(.fields.Date // "" | . == (now | strftime("%Y-%m-%d"))) | .fields.CPA // 0] | first // 0),
  today_cr: ([.records[] | select(.fields.Date // "" | . == (now | strftime("%Y-%m-%d"))) | .fields.CR // 0] | first // 0),
  today_email_rev: ([.records[] | select(.fields.Date // "" | . == (now | strftime("%Y-%m-%d"))) | .fields.Email_Revenue // 0] | first // 0),
  today_total_rev: ([.records[] | select(.fields.Date // "" | . == (now | strftime("%Y-%m-%d"))) | .fields.Total_Revenue // 0] | first // 0),
  today_ad_spend: ([.records[] | select(.fields.Date // "" | . == (now | strftime("%Y-%m-%d"))) | .fields.Ad_Spend // 0] | first // 0),
  today_pipeline: ([.records[] | select(.fields.Date // "" | . == (now | strftime("%Y-%m-%d"))) | .fields.Pipeline_Value // 0] | first // 0)
}' /tmp/daily_kpis.json > /tmp/baseline.json

cat /tmp/baseline.json

# ==== Block 3/6 ====
> /tmp/anomalies.jsonl

BASELINE_CPA=$(jq -r '.baseline_cpa' /tmp/baseline.json)
TODAY_CPA=$(jq -r '.today_cpa' /tmp/baseline.json)
BASELINE_CR=$(jq -r '.baseline_cr' /tmp/baseline.json)
TODAY_CR=$(jq -r '.today_cr' /tmp/baseline.json)
TODAY_EMAIL_REV=$(jq -r '.today_email_rev' /tmp/baseline.json)
TODAY_TOTAL_REV=$(jq -r '.today_total_rev' /tmp/baseline.json)
BASELINE_AD_SPEND=$(jq -r '.baseline_ad_spend' /tmp/baseline.json)
TODAY_AD_SPEND=$(jq -r '.today_ad_spend' /tmp/baseline.json)

# CPA spike
if (( $(echo "$TODAY_CPA > $BASELINE_CPA * 2" | bc -l) )); then
  echo "{\"engine\":\"ad-management\",\"type\":\"CPA Spike\",\"severity\":\"Critical\",\"current\":$TODAY_CPA,\"expected\":$BASELINE_CPA,\"action\":\"Pauze losers, check creative fatigue\"}" >> /tmp/anomalies.jsonl
elif (( $(echo "$TODAY_CPA > $BASELINE_CPA * 1.5" | bc -l) )); then
  echo "{\"engine\":\"ad-management\",\"type\":\"CPA Spike\",\"severity\":\"Warning\",\"current\":$TODAY_CPA,\"expected\":$BASELINE_CPA,\"action\":\"Monitor + review top spenders\"}" >> /tmp/anomalies.jsonl
fi

# CR drop
if (( $(echo "$TODAY_CR < $BASELINE_CR * 0.7" | bc -l) )); then
  echo "{\"engine\":\"conversion\",\"type\":\"CR Drop\",\"severity\":\"Critical\",\"current\":$TODAY_CR,\"expected\":$BASELINE_CR,\"action\":\"Check Shopify checkout + landing pages\"}" >> /tmp/anomalies.jsonl
fi

# Email share
if (( $(echo "$TODAY_TOTAL_REV > 0" | bc -l) )); then
  EMAIL_SHARE=$(echo "scale=4; $TODAY_EMAIL_REV / $TODAY_TOTAL_REV * 100" | bc)
  if (( $(echo "$EMAIL_SHARE < 15" | bc -l) )); then
    echo "{\"engine\":\"revenue\",\"type\":\"Email Drop\",\"severity\":\"Warning\",\"current\":$EMAIL_SHARE,\"expected\":20,\"action\":\"Review flows + segment health\"}" >> /tmp/anomalies.jsonl
  fi
fi

# Budget overrun
if (( $(echo "$TODAY_AD_SPEND > $BASELINE_AD_SPEND * 2" | bc -l) )); then
  echo "{\"engine\":\"ad-management\",\"type\":\"Budget Overrun\",\"severity\":\"Critical\",\"current\":$TODAY_AD_SPEND,\"expected\":$BASELINE_AD_SPEND,\"action\":\"Check for runaway campaign\"}" >> /tmp/anomalies.jsonl
fi

ANOM_COUNT=$(wc -l < /tmp/anomalies.jsonl 2>/dev/null || echo 0)
echo "Anomalies: $ANOM_COUNT"

# ==== Block 4/6 ====
while IFS= read -r anom; do
  RECORD=$(jq -c 'del(.current, .expected) + {fields: (. + {detected_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))})} | {fields: .fields}' <<< "$anom")

  curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Anomaly_Log" \
    -H "Authorization: Bearer $AIRTABLE_PAT" \
    -H "Content-Type: application/json" \
    -d "{\"records\":[$RECORD]}" > /dev/null
done < /tmp/anomalies.jsonl

if [ "$ANOM_COUNT" -gt 0 ]; then
  MSG="🔔 *Bamboo anomalies gedetecteerd*%0A"
  while IFS= read -r anom; do
    T=$(echo "$anom" | jq -r '.type')
    S=$(echo "$anom" | jq -r '.severity')
    A=$(echo "$anom" | jq -r '.action')
    ICON="⚠️"
    [ "$S" = "Critical" ] && ICON="🚨"
    MSG="${MSG}${ICON} *${T}* (${S})%0A→ ${A}%0A"
  done < /tmp/anomalies.jsonl

  curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "parse_mode=Markdown" \
    --data-urlencode "text=$MSG"
fi

# ==== Block 5/6 ====
LOG=$(jq -n --argjson c "$ANOM_COUNT" '{
  fields: {
    routine_name: "bm-anomaly-detector",
    status: "success",
    records_written: $c,
    summary: ($c | tostring + " anomalies detected across 6 engines"),
    timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  }
}')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/BM_Executions" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[$LOG]}"

# ==== Block 6/6 ====
# [SKIPPED slash-command] /bm-anomaly-detector
