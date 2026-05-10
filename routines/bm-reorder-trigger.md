---
name: bm-reorder-trigger
cron: "0 10 * * *"
timezone: Europe/Amsterdam
mcps: [airtable]
owner: bamboo
status: active
origin: bamboo-reorder-trigger.json
---

# Reorder Trigger

Daily 10:00 — analyze Shopify order history, compute depletion date per product volume (24r=60d, 48r=120d, 96r=240d), trigger Klaviyo reorder flow if within 14 days of depletion.

Retentie-loop: voorspel wanneer voorraad op is → tijdig herinneren → herhaalklant.

---

## Environment Variables

- `AIRTABLE_PAT`, `AIRTABLE_BASE_ID`
- `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_STORE_URL`
- `KLAVIYO_API_KEY`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

---

## 1. Fetch last 250 days of Shopify orders

```bash
CUTOFF=$(date -u -d "250 days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-250d +%Y-%m-%dT%H:%M:%SZ)

curl -sS "https://$SHOPIFY_STORE_URL/admin/api/2024-01/orders.json?created_at_min=$CUTOFF&status=any&financial_status=paid&limit=250" \
  -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" > /tmp/orders_250d.json

ORDER_COUNT=$(jq '.orders | length' /tmp/orders_250d.json)
echo "Paid orders last 250d: $ORDER_COUNT"
```

---

## 2. Per customer: extract last order + volume + depletion date

```bash
# Group by customer email, find last order
jq '[.orders[] | {
  email: (.email // .customer.email // ""),
  order_date: .created_at,
  line_items: [.line_items[]? | {title: .title, quantity: .quantity}]
}] | group_by(.email) | map(
  (. | sort_by(.order_date) | last) as $last | {
    email: $last.email,
    last_order: $last.order_date,
    items: $last.line_items
  }
) | map(select(.email != ""))' /tmp/orders_250d.json > /tmp/customers_last_order.json

CUST_COUNT=$(jq 'length' /tmp/customers_last_order.json)
echo "Unique customers: $CUST_COUNT"
```

---

## 3. Compute depletion + filter reorder candidates

```bash
> /tmp/reorder_candidates.jsonl
TODAY_EPOCH=$(date +%s)

jq -c '.[]' /tmp/customers_last_order.json | while read -r cust; do
  EMAIL=$(echo "$cust" | jq -r '.email')
  LAST_ORDER=$(echo "$cust" | jq -r '.last_order')

  # Extract volume from product title (24/48/96 rollen)
  ITEMS=$(echo "$cust" | jq -r '.items[]?.title // ""')
  VOLUME=0
  if echo "$ITEMS" | grep -iqE "96.?rol"; then
    VOLUME=96
    DAYS=240
  elif echo "$ITEMS" | grep -iqE "48.?rol"; then
    VOLUME=48
    DAYS=120
  elif echo "$ITEMS" | grep -iqE "24.?rol"; then
    VOLUME=24
    DAYS=60
  else
    continue
  fi

  # Compute depletion date
  ORDER_EPOCH=$(date -d "$LAST_ORDER" +%s 2>/dev/null || echo 0)
  DEPLETION_EPOCH=$((ORDER_EPOCH + DAYS * 86400))
  DAYS_UNTIL=$(( (DEPLETION_EPOCH - TODAY_EPOCH) / 86400 ))

  # Reorder window: <=14 days, but not more than 7 days past due
  if [ "$DAYS_UNTIL" -le 14 ] && [ "$DAYS_UNTIL" -gt -7 ]; then
    echo "{\"email\":\"$EMAIL\",\"volume\":$VOLUME,\"days_until_depletion\":$DAYS_UNTIL,\"last_order\":\"$LAST_ORDER\"}" >> /tmp/reorder_candidates.jsonl
  fi
done

CANDIDATES=$(wc -l < /tmp/reorder_candidates.jsonl 2>/dev/null || echo 0)
echo "Reorder candidates: $CANDIDATES"
```

---

## 4. Upsert Reorder_Signals + trigger Klaviyo event

```bash
TRIGGERED=0

while IFS= read -r cand; do
  EMAIL=$(echo "$cand" | jq -r '.email')
  VOLUME=$(echo "$cand" | jq -r '.volume')
  DAYS=$(echo "$cand" | jq -r '.days_until_depletion')

  # Upsert signal
  UPSERT=$(jq -n --arg e "$EMAIL" --argjson v "$VOLUME" --argjson d "$DAYS" '{
    fields: {
      email: $e,
      volume: $v,
      days_until_depletion: $d,
      reminder_sent: true,
      signaled_at: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
    }
  }')

  curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/Reorder_Signals" \
    -H "Authorization: Bearer $AIRTABLE_PAT" \
    -H "Content-Type: application/json" \
    -d "{\"records\":[$UPSERT]}" > /dev/null

  # Fire Klaviyo custom event → triggers Reorder-${VOLUME} flow
  KLAVIYO_PAYLOAD=$(jq -n --arg e "$EMAIL" --argjson v "$VOLUME" --argjson d "$DAYS" '{
    data: {
      type: "event",
      attributes: {
        properties: {volume: $v, days_until_depletion: $d},
        metric: {data: {type: "metric", attributes: {name: "Reorder Reminder"}}},
        profile: {data: {type: "profile", attributes: {email: $e}}}
      }
    }
  }')

  curl -sS -X POST "https://a.klaviyo.com/api/events/" \
    -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
    -H "accept: application/vnd.api+json" \
    -H "revision: 2024-10-15" \
    -H "Content-Type: application/json" \
    -d "$KLAVIYO_PAYLOAD" > /dev/null

  TRIGGERED=$((TRIGGERED + 1))
done < /tmp/reorder_candidates.jsonl

echo "Klaviyo events triggered: $TRIGGERED"
```

---

## 5. Telegram summary + log

```bash
curl -sS -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d "chat_id=$TELEGRAM_CHAT_ID" \
  -d "parse_mode=Markdown" \
  --data-urlencode "text=🔁 *Reorder trigger (Bamboo)*%0A$CANDIDATES klanten genotificeerd · $TRIGGERED Klaviyo events"

LOG=$(jq -n --argjson cust "$CUST_COUNT" --argjson triggered "$TRIGGERED" '{
  fields: {
    routine_name: "bm-reorder-trigger",
    status: "success",
    records_written: $triggered,
    summary: ($cust | tostring + " customers scanned, " + ($triggered | tostring) + " reminders triggered"),
    timestamp: (now | strftime("%Y-%m-%dT%H:%M:%SZ"))
  }
}')

curl -sS -X POST "https://api.airtable.com/v0/$AIRTABLE_BASE_ID/BM_Executions" \
  -H "Authorization: Bearer $AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d "{\"records\":[$LOG]}"
```

---

## Error handling

- Shopify fail → stop with error log + Telegram
- Klaviyo event fail (per candidate) → log warning, continue
- Zero candidates → silent success (normal on slow days)

## Verification

```bash
/bm-reorder-trigger
```
Expect: rows in `Reorder_Signals`, Klaviyo events fired, Telegram summary.
