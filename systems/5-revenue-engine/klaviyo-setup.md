# Klaviyo Setup — Bamboo Revenue Engine

Stap-voor-stap setup om Klaviyo te verbinden met Shopify en de n8n workflows.

---

## Stap 1 — Klaviyo account

1. Ga naar [klaviyo.com](https://www.klaviyo.com/) en maak een account (of log in).
2. Kies plan: gratis tot 500 contacts — voor Bamboo start met Email plan (betaald) want we gebruiken flows.
3. Vul company info: Bamboo Disposables BV, website www.bamboodisposables.nl, branche e-commerce.

---

## Stap 2 — Private API Key aanmaken

1. Rechtsboven op je naam klikken → **Settings**.
2. Links in menu: **API Keys** (onder Account).
3. Klik **Create Private API Key**.
4. Naam: `bamboo-revenue-engine`.
5. Scopes (minimaal deze aanzetten — read/write waar nodig):
   - **Campaigns**: Read + Write
   - **Flows**: Read + Write
   - **Lists**: Read + Write
   - **Profiles**: Read + Write
   - **Metrics**: Read
   - **Segments**: Read + Write
6. Klik **Create**.
7. **Kopieer de key nu** — je ziet hem maar 1x.

---

## Stap 3 — Key opslaan in .env

```bash
# ~/projects/mac-mini-builds/bamboo/.env
KLAVIYO_API_KEY=pk_xxxxxxxxxxxxxxxxxxxxxxxxx
```

Ook toevoegen aan n8n credentials (Settings → Credentials → New → Header Auth):
- Name: `Klaviyo API`
- Header Name: `Authorization`
- Header Value: `Klaviyo-API-Key pk_xxxxx`

---

## Stap 4 — Shopify koppelen aan Klaviyo

1. In Klaviyo: **Integrations** (linkermenu) → **Browse Integrations**.
2. Zoek **Shopify** → klik.
3. **Connect Store** → log in met Shopify admin voor `bamboodisposables.myshopify.com`.
4. Accepteer permissions (orders, customers, products lezen).
5. Sync start automatisch — kan 1-4 uur duren voor eerste load.
6. Check onder **Profiles** → counts moeten matchen met Shopify customers.

### Webhook setup (automatisch door integratie)
Na Shopify connect worden deze events automatisch in Klaviyo gepusht:
- `Placed Order`
- `Ordered Product`
- `Fulfilled Order`
- `Cancelled Order`
- `Refunded Order`
- `Started Checkout`

Gebruik deze events later als flow triggers.

---

## Stap 5 — Flows voorbereiden (placeholder IDs)

In Klaviyo → **Flows** → **Create Flow** → 5 flows aanmaken (leeg mag, vullen we later via `/email-flow-builder`):

| Flow naam | Type | Trigger | Env var |
|-----------|------|---------|---------|
| Bamboo Welcome | Welcome | List subscribe (newsletter) | `KLAVIYO_WELCOME_FLOW_ID` |
| Bamboo Aftersales | Aftersales | Fulfilled Order + 3 dagen delay | `KLAVIYO_AFTERSALES_FLOW_ID` |
| Bamboo Reorder 24 | Reorder | Metric: custom "Reorder Reminder 24" | `KLAVIYO_REORDER_24_FLOW_ID` |
| Bamboo Reorder 48 | Reorder | Metric: custom "Reorder Reminder 48" | `KLAVIYO_REORDER_48_FLOW_ID` |
| Bamboo Reorder 96 | Reorder | Metric: custom "Reorder Reminder 96" | `KLAVIYO_REORDER_96_FLOW_ID` |
| Bamboo Winback | Winback | Segment: Churned (180d+) | `KLAVIYO_WINBACK_FLOW_ID` |
| Bamboo Upsell 24→48 | Upsell | Placed Order #2 van 24 rollen | `KLAVIYO_UPSELL_24_48_FLOW_ID` |

Voor elke flow: kopieer Flow ID uit URL (`/flows/list/XXXXXX/...`) → `.env`.

---

## Stap 6 — Verify API call

```bash
curl -X GET "https://a.klaviyo.com/api/flows/" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-02-15" \
  -H "accept: application/json"
```

**Expected**: HTTP 200 + JSON met list van flows (mogelijk leeg als nog niks aangemaakt).

Test profiles call:
```bash
curl -X GET "https://a.klaviyo.com/api/profiles/?page[size]=5" \
  -H "Authorization: Klaviyo-API-Key $KLAVIYO_API_KEY" \
  -H "revision: 2024-02-15"
```

Als beide 200 geven → key werkt, integratie live, klaar voor n8n workflows.

---

## Troubleshooting

| Probleem | Oplossing |
|----------|-----------|
| 401 Unauthorized | Key verkeerd gekopieerd of scopes missen |
| 403 Forbidden | Scope ontbreekt — maak nieuwe key met juiste scopes |
| 429 Rate limit | Klaviyo free tier = 10 req/sec, upgrade of batch vertragen |
| Shopify sync geeft 0 profiles | Wacht 4u, of trigger handmatige sync via Klaviyo integratie settings |
| Revision header fout | Altijd `revision: 2024-02-15` meesturen |
