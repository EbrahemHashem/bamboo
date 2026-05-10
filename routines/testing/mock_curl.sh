#!/usr/bin/env bash
# Mock curl — intercepts all curl calls and returns fixture JSON based on URL pattern.

export FIXTURES_DIR="C:/Users/Lenovo/Desktop/187N/RUtenes/dev-workspace/clients/bamboo/routines/testing/fixtures"

curl() {
  local FIXTURES="C:/Users/Lenovo/Desktop/187N/RUtenes/dev-workspace/clients/bamboo/routines/testing/fixtures"
  local args=("$@")
  local url=""
  local method="GET"

  for ((i=0; i<${#args[@]}; i++)); do
    case "${args[$i]}" in
      -X|--request)
        method="${args[$((i+1))]}"
        ;;
      http://*|https://*|smtps://*|smtp://*)
        url="${args[$i]}"
        ;;
      --url)
        url="${args[$((i+1))]}"
        ;;
    esac
  done

  if [ -z "$url" ]; then
    for arg in "${args[@]}"; do
      if [[ "$arg" == http* || "$arg" == smtp* ]]; then
        url="$arg"
      fi
    done
  fi

  echo "[MOCK-CURL] $method ${url:-unknown}" >&2

  _emit() {
    local file="$1"
    if [ -f "$FIXTURES/$file" ]; then
      cat "$FIXTURES/$file"
    else
      echo '{"ok":true,"mock":true,"data":[],"records":[]}'
    fi
  }

  case "$url" in
    *"api.airtable.com"*"Competitors"*|*"api.airtable.com"*"competitors"*)
      _emit "airtable-competitors.json" ;;
    *"api.airtable.com"*"Ad_Research"*)
      _emit "airtable-ad-research.json" ;;
    *"api.airtable.com"*"AB_Tests"*)
      _emit "airtable-ab-tests.json" ;;
    *"api.airtable.com"*"Ad_Variants"*)
      _emit "airtable-ad-variants.json" ;;
    *"api.airtable.com"*"Conversion_Tracking"*)
      _emit "airtable-conversion.json" ;;
    *"api.airtable.com"*"B2B_Leads"*)
      _emit "airtable-b2b-leads.json" ;;
    *"api.airtable.com"*"Reorder_Signals"*)
      _emit "airtable-empty.json" ;;
    *"api.airtable.com"*"Email_Performance"*)
      _emit "airtable-email-perf.json" ;;
    *"api.airtable.com"*"Daily_KPIs"*)
      _emit "airtable-daily-kpis.json" ;;
    *"api.airtable.com"*"Anomaly_Log"*)
      _emit "airtable-anomaly-log.json" ;;
    *"api.airtable.com"*"Customer_Segments"*)
      _emit "airtable-customer-segments.json" ;;
    *"api.airtable.com"*"Weekly_Digests"*|*"api.airtable.com"*"Strategy_Reports"*|*"api.airtable.com"*"BM_Executions"*)
      _emit "airtable-create-response.json" ;;
    *"api.airtable.com"*)
      if [ "$method" = "POST" ] || [ "$method" = "PATCH" ]; then
        _emit "airtable-create-response.json"
      else
        _emit "airtable-empty.json"
      fi ;;

    *"api.apify.com"*"meta-ad-library"*)
      _emit "apify-meta-ads.json" ;;
    *"api.apify.com"*)
      _emit "apify-generic.json" ;;

    *"graph.facebook.com"*)
      _emit "meta-graph.json" ;;
    *"googleads.googleapis.com"*)
      _emit "google-ads.json" ;;

    *"myshopify.com"*|*"admin.shopify.com"*"orders"*)
      _emit "shopify-orders.json" ;;
    *"myshopify.com"*|*"admin.shopify.com"*)
      _emit "shopify-orders.json" ;;

    *"a.klaviyo.com"*"events"*)
      _emit "klaviyo-event-created.json" ;;
    *"a.klaviyo.com"*"flow-values-reports"*)
      _emit "klaviyo-flow-values.json" ;;
    *"a.klaviyo.com"*"flows"*)
      _emit "klaviyo-flows.json" ;;
    *"a.klaviyo.com"*|*"klaviyo.com"*)
      _emit "klaviyo-generic.json" ;;

    *"gmail.googleapis.com"*"messages/"*)
      _emit "gmail-message-detail.json" ;;
    *"gmail.googleapis.com"*|*"googleapis.com/gmail"*)
      _emit "gmail-messages.json" ;;

    *"api.anthropic.com"*)
      _emit "anthropic-messages.json" ;;

    *"api.telegram.org"*)
      _emit "telegram-ok.json" ;;

    *"smtp"*|*"smtps"*)
      echo "SMTP_OK" ;;

    *)
      echo "[MOCK-CURL] WARN: no fixture for URL: $url" >&2
      echo '{"ok":true,"mock":"generic","data":[],"records":[]}' ;;
  esac

  return 0
}

export -f curl
