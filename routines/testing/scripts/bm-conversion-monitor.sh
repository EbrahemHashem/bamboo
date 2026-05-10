#!/usr/bin/env bash
# Auto-extracted from: bm-conversion-monitor.md
# 6 bash block(s)
set +e

# ==== Block 1/6 ====
CUTOFF=$(date -u -d "24 hours ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-24H +%Y-%m-%dT%H:%M:%SZ)

curl -sS "https://$SHOPIFY_STORE_URL/admin/api/2024-01/orders.json?created_at_min=$CUTOFF&status=any&limit=250" \
  -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" > /tmp/orders_24h.json

ORDER_COUNT=$(jq '.orders | length' /tmp/orders_24h.json)
echo "Orders last 24h: $ORDER_COUNT"

# ==== Block 2/6 ====
curl -sS "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Ad_Variants?filterByFormula=%7BStatus%7D%3D%27Active%27" \
  -H "Authorization: Bearer $AIRTABLE_PAT" > /tmp/ad_variants.json

# ==== Block 3/6 ====
> /tmp/conversion_flags.jsonl

jq -c '.records[]' /tmp/ad_variants.json | while read -r ad; do
  AD_ID=$(echo "$ad" | jq -r '.id')
  CAMPAIGN=$(echo "$ad" | jq -r '.fields.campaign_name // "unknown"')
  SPEND=$(echo "$ad" | jq -r '.fields.spend_24h // 0')
  CLICKS=$(echo "$ad" | jq -r '.fields.clicks_24h // 0')
  SESSIONS=$(echo "$ad" | jq -r '.fields.sessions_24h // 0')

  # Count orders attributed (by source_name or UTM)
  ORDERS=$(jq --arg c "$CAMPAIGN" '[.orders[] | select((.source_name // "") | contains($c)) or ((.note_attributes // []) | any(.name == "utm_campaign" and .value == $c))] | length' /tmp/orders_24h.json)

  # Calculate metrics
  CR=$(echo "scale=4; $ORDERS / ($SESSIONS + 0.001)" | bc 2>/dev/null || echo "0")
  CPA=$(echo "scale=2; $SPEND / ($ORDERS + 0.001)" | bc 2>/dev/null || echo "0")

  FLAG=""
  # Clicks but no conversion
  if [ "$CLICKS" -gt 50 ] && [ "$ORDERS" -eq 0 ]; then
    FLAG="Clicks No Conversion"
  # High CPA
  elif (( $(echo "$CPA > 15" | bc -l) )); then
    FLAG="High CPA"
  # Low CR
  elif [ "$SESSIONS" -gt 100 ] && (( $(echo "$CR < 0.01" | bc -l) )); then
    FLAG="Low CR"
  fi

  # Upsert Conversion Tracking row
  UPSERT=$(jq -n --arg ad "$AD_ID" --arg c "$CAMPAIGN" --arg flag "$FLAG" \
    --argjson orders "$ORDERS" --arg cr "$CR" --arg cpa "$CPA" \
    '{fields: {
      ad_id: $ad,
      campaign: $c,
      orders_24h: $orders,
      cr_24h: ($cr | tonumber),
      cpa_24h: ($cpa | tonumber),
      flag: $flag,
      snapshot_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
    }}')

  curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Conversion_Tracking" \
    -H "Authorization: Bearer $AIRTABLE_PAT" \
    -H "Content-Type: application/json" \
    -d "{\"records\":[$UPSERT]}" > /dev/null

  if [ -n "$FLAG" ]; then
    echo "{\"campaign\":\"$CAMPAIGN\",\"flag\":\"$FLAG\",\"cpa\":$CPA,\"cr\":$CR}" >> /tmp/conversion_flags.jsonl
  fi
done

FLAG_COUNT=$(wc -l < /tmp/conversion_flags.jsonl 2>/dev/null || echo 0)
echo "Flags: $FLAG_COUNT"

# ==== Block 4/6 ====
if [ "$FLAG_COUNT" -gt 0 ]; then
  MSG="⚠️ *Conversion flags (Bamboo)* %0A"
  while IFS= read -r line; do
    C=$(echo "$line" | jq -r '.campaign')
    F=$(echo "$line" | jq -r '.flag')
    CPA=$(echo "$line" | jq -r '.cpa')
    MSG="${MSG}• ${C} → ${F} (CPA €${CPA})%0A"
  done < /tmp/conversion_flags.jsonl

  curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "parse_mode=Markdown" \
    --data-urlencode "text=$MSG"
fi

# ==== Block 5/6 ====
LOG=$(jq -n --argjson orders "$ORDER_COUNT" --argjson flags "$FLAG_COUNT" '{
  fields: {
    routine_name: "bm-conversion-monitor",
    status: "success",
    records_written: $flags,
    summary: ($orders | tostring + " orders analyzed, " + ($flags | tostring) + " flags raised"),
    timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  }
}')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/BM_Executions" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[$LOG]}"

# ==== Block 6/6 ====
# [SKIPPED slash-command] /bm-conversion-monitor
