#!/usr/bin/env bash
# Auto-extracted from: bm-daily-intelligence.md
# 9 bash block(s)
set +e

# ==== Block 1/9 ====
YESTERDAY=$(date -u -d "yesterday" +%Y-%m-%d 2>/dev/null || date -u -v-1d +%Y-%m-%d)
echo "Aggregating for: $YESTERDAY"

# ==== Block 2/9 ====
curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Ad_Variants?filterByFormula=%7Bdate%7D%3D%27$YESTERDAY%27&pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/ads_yesterday.json

AD_SPEND=$(jq '[.records[].fields.spend // 0] | add // 0' /tmp/ads_yesterday.json)
AD_REVENUE=$(jq '[.records[].fields.revenue // 0] | add // 0' /tmp/ads_yesterday.json)
IMPRESSIONS=$(jq '[.records[].fields.impressions // 0] | add // 0' /tmp/ads_yesterday.json)
CLICKS=$(jq '[.records[].fields.clicks // 0] | add // 0' /tmp/ads_yesterday.json)
CONVERSIONS=$(jq '[.records[].fields.conversions // 0] | add // 0' /tmp/ads_yesterday.json)

echo "Ad: spend=€$AD_SPEND revenue=€$AD_REVENUE conv=$CONVERSIONS"

# ==== Block 3/9 ====
curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Conversion_Tracking?filterByFormula=DATESTR(%7Bsnapshot_at%7D)%3D%27$YESTERDAY%27&pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/conv_yesterday.json

TOTAL_ORDERS=$(jq '[.records[].fields.orders_24h // 0] | add // 0' /tmp/conv_yesterday.json)

# Customers: new vs repeat (from Customer_Segments)
curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Customer_Segments?pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/segments.json

NEW_CUST=$(jq '[.records[] | select(.fields.last_order // "" | startswith("'$YESTERDAY'")) | select(.fields.total_orders // 0 == 1)] | length' /tmp/segments.json)
REPEAT_CUST=$(jq '[.records[] | select(.fields.last_order // "" | startswith("'$YESTERDAY'")) | select(.fields.total_orders // 0 > 1)] | length' /tmp/segments.json)

# ==== Block 4/9 ====
curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Email_Performance?pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/email_perf.json

EMAIL_REVENUE=$(jq '[.records[] | .fields.revenue_7d // 0] | add // 0' /tmp/email_perf.json)
# Normalize to daily
EMAIL_REVENUE=$(echo "scale=2; $EMAIL_REVENUE / 7" | bc)

curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/B2B_Leads?filterByFormula=NOT(OR(%7BStage%7D%3D%27Closed+Won%27%2C%7BStage%7D%3D%27Closed+Lost%27))&pageSize=100" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/b2b_active.json

PIPELINE_VALUE=$(jq '[.records[].fields.estimated_value // 0] | add // 0' /tmp/b2b_active.json)
PIPELINE_COUNT=$(jq '.records | length' /tmp/b2b_active.json)

# ==== Block 5/9 ====
TOTAL_REVENUE=$(echo "scale=2; $AD_REVENUE + $EMAIL_REVENUE" | bc)
ROAS=$(echo "scale=2; $AD_REVENUE / ($AD_SPEND + 0.001)" | bc)
CPA=$(echo "scale=2; $AD_SPEND / ($CONVERSIONS + 0.001)" | bc)
CR=$(echo "scale=4; $CONVERSIONS / ($CLICKS + 0.001)" | bc)
REPEAT_RATE=$(echo "scale=4; $REPEAT_CUST / ($NEW_CUST + $REPEAT_CUST + 0.001) * 100" | bc)
EMAIL_SHARE=$(echo "scale=4; $EMAIL_REVENUE / ($TOTAL_REVENUE + 0.001) * 100" | bc)

echo "ROAS=$ROAS CPA=€$CPA CR=$CR RepeatRate=$REPEAT_RATE% EmailShare=$EMAIL_SHARE%"

# ==== Block 6/9 ====
RECORD=$(jq -n \
  --arg date "$YESTERDAY" \
  --argjson ad_spend "$AD_SPEND" --argjson ad_rev "$AD_REVENUE" \
  --argjson conversions "$CONVERSIONS" --argjson orders "$TOTAL_ORDERS" \
  --argjson new "$NEW_CUST" --argjson repeat "$REPEAT_CUST" \
  --argjson email_rev "$EMAIL_REVENUE" --argjson pipeline "$PIPELINE_VALUE" \
  --argjson pipeline_count "$PIPELINE_COUNT" --argjson total_rev "$TOTAL_REVENUE" \
  --arg roas "$ROAS" --arg cpa "$CPA" --arg cr "$CR" --arg repeat_rate "$REPEAT_RATE" \
  --arg email_share "$EMAIL_SHARE" '{
    fields: {
      Date: $date,
      Ad_Spend: $ad_spend,
      Ad_Revenue: $ad_rev,
      Conversions: $conversions,
      Total_Orders: $orders,
      New_Customers: $new,
      Repeat_Customers: $repeat,
      Email_Revenue: $email_rev,
      Pipeline_Value: $pipeline,
      Pipeline_Count: $pipeline_count,
      Total_Revenue: $total_rev,
      ROAS: ($roas | tonumber),
      CPA: ($cpa | tonumber),
      CR: ($cr | tonumber),
      Repeat_Rate: ($repeat_rate | tonumber),
      Email_Share: ($email_share | tonumber)
    }
  }')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Daily_KPIs" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[$RECORD]}"

# ==== Block 7/9 ====
# Pick one hot insight
INSIGHT=""
ACTION=""

if (( $(echo "$ROAS > 3" | bc -l) )); then
  INSIGHT="ROAS ${ROAS}x gister — boven break-even (1.5). Ads doen hun werk."
  ACTION="Schaal de top-spenders +20% vandaag."
elif (( $(echo "$ROAS < 1.5" | bc -l) )); then
  INSIGHT="ROAS ${ROAS}x gister — onder break-even (1.5)."
  ACTION="Pauzeer ads met CPA > €15. Check fatigue (>7d run + CTR <0.5%)."
elif (( $(echo "$EMAIL_SHARE < 15" | bc -l) )); then
  INSIGHT="Email = ${EMAIL_SHARE}%% van omzet (doel: 20-30%%)."
  ACTION="Check Klaviyo retention flows — draait reorder (96r volume)?"
elif (( $(echo "$REPEAT_RATE > 30" | bc -l) )); then
  INSIGHT="Herhaalratio ${REPEAT_RATE}%% — sterke retentie."
  ACTION="Push B2B: $PIPELINE_COUNT actieve leads (€$PIPELINE_VALUE waarde)."
else
  INSIGHT="Stabiel: ROAS ${ROAS}x, repeat ${REPEAT_RATE}%%."
  ACTION="Check competitor scrape voor nieuwe angles."
fi

MSG=$(cat <<MSG
☀️ *Bamboo Morning Brief — $YESTERDAY*

*Omzet:* €$TOTAL_REVENUE (ads €$AD_REVENUE · email €$EMAIL_REVENUE)
*ROAS:* ${ROAS}x · *CPA:* €$CPA · *CR:* $CR
*Klanten:* $NEW_CUST nieuw · $REPEAT_CUST repeat
*B2B pipeline:* $PIPELINE_COUNT leads · €$PIPELINE_VALUE

💡 *Insight:* $INSIGHT
🎯 *Action:* $ACTION
MSG
)

curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "parse_mode=Markdown" \
  --data-urlencode "text=$MSG"

# ==== Block 8/9 ====
LOG=$(jq -n --argjson rev "$TOTAL_REVENUE" '{
  fields: {
    routine_name: "bm-daily-intelligence",
    status: "success",
    records_written: 1,
    summary: ("€" + ($rev | tostring) + " revenue aggregated across 6 engines"),
    timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  }
}')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/BM_Executions" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[$LOG]}"

# ==== Block 9/9 ====
# [SKIPPED slash-command] /bm-daily-intelligence
