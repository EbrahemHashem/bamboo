#!/usr/bin/env bash
# Fake env vars for Bamboo mock testing. All values are placeholders.

# Airtable
export AIRTABLE_PAT="mock-airtable-pat-bamboo"
export AIRTABLE_API_KEY="mock-airtable-key-bamboo"
export AIRTABLE_BASE_ID="appMockBambooBase01"
export BM_AIRTABLE_BASE_ID="appMockBambooBase01"

# Apify
export APIFY_TOKEN="mock-apify-token-bamboo"

# Meta Ads
export META_ACCESS_TOKEN="mock-meta-token-bamboo"
export META_AD_ACCOUNT_ID="act_9876543210"

# Google Ads (for ad-performance-loop)
export GOOGLE_ADS_CUSTOMER_ID="123-456-7890"
export GOOGLE_ADS_DEVELOPER_TOKEN="mock-google-dev-token"
export GOOGLE_ACCESS_TOKEN="mock-google-access-xxxx"

# Shopify
export SHOPIFY_ACCESS_TOKEN="mock-shopify-bamboo"
export SHOPIFY_STORE_URL="bamboo-mock.myshopify.com"

# Klaviyo
export KLAVIYO_API_KEY="mock-klaviyo-bamboo"

# Anthropic
export ANTHROPIC_API_KEY="mock-anthropic-bamboo"

# Telegram
export TELEGRAM_BOT_TOKEN="mock-telegram-bamboo"
export TELEGRAM_CHAT_ID="-1009876543210"
export BM_OPS_CHAT_ID="-1009876543210"

# Email / SMTP
export SMTP_HOST="smtp.bamboo-mock.com"
export SMTP_USER="ops@bamboodisposables.nl"
export SMTP_PASSWORD="mock-smtp-bamboo"
export BAMBOO_NATHAN_EMAIL="nathan@bamboodisposables.nl"

# Gmail (for b2b-pipeline)
export GMAIL_ACCESS_TOKEN="mock-gmail-bamboo"
export GMAIL_USER="ops@bamboodisposables.nl"

# Google Drive
export GOOGLE_APPLICATION_CREDENTIALS="/tmp/mock-gdrive-creds.json"
