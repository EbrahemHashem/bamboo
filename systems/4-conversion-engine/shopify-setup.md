# Shopify Setup — Custom App voor Bamboo Conversion Engine

Nathan heeft een eigen Shopify webshop (`bamboodisposables.myshopify.com`). Systeem 4 leest daar orders, producten en analytics van via een Custom App met Admin API access token. Geen publieke app store, geen OAuth flow — alles gaat via 1 token dat Nathan zelf genereert.

Stap voor stap:

---

## Stap 1 — Open Shopify admin

1. Ga naar `https://bamboodisposables.myshopify.com/admin`
2. Login met Nathan's eigenaarsaccount

---

## Stap 2 — Custom apps aanzetten (eenmalig)

1. Linker menu: **Settings** (tandwieltje onderin)
2. Klik op **Apps and sales channels**
3. Klik rechtsboven op **Develop apps**
4. Als Shopify nog vraagt "Allow custom app development" → klik op die knop, bevestig

---

## Stap 3 — Nieuwe app aanmaken

1. Klik op **Create an app**
2. App name: `Bamboo AI Conversion`
3. App developer: Nathan (jouw eigen e-mail)
4. Klik **Create app**

---

## Stap 4 — Admin API scopes configureren

Open het tabblad **Configuration** in de nieuwe app.

Onder **Admin API access scopes** → **Configure** → vink aan:

| Scope | Waarom |
|-------|--------|
| `read_products` | Productinfo voor page-optimizer en store-page-audit |
| `read_orders` | Orders per dag voor conversion-analyst |
| `read_customers` | Segmentatie voor retentie en B2B detectie |
| `read_inventory` | Voorraad check voor bundle-creator |
| `read_price_rules` | Huidige kortingsregels lezen |
| `read_discounts` | Actieve discount codes lezen |
| `read_analytics` | Sessie- en conversie-data |
| `write_products` | **Optioneel** — alleen aanzetten als Nathan auto-apply van winnende page variants wil. Anders uit laten. |

**Klik op Save** onderaan.

---

## Stap 5 — App installeren in je eigen store

1. Ga naar tabblad **API credentials**
2. Klik bovenaan op **Install app**
3. Bevestig: **Install**
4. Direct daarna zie je **Admin API access token** — begint met `shpat_...`
5. **Klik op "Reveal token once"** en kopieer direct

**Belangrijk:** je ziet dit token maar één keer. Als je het kwijt bent, moet je de app opnieuw installeren en krijgt je een nieuw token.

---

## Stap 6 — Token en store URL opslaan in .env

Open de `.env` file in de Bamboo build folder (`~/bamboo-build/.env` of zoals install.sh het heeft gezet) en voeg toe:

```bash
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_STORE_URL=bamboodisposables.myshopify.com
```

Geen https, geen trailing slash — alleen de kale store handle.

---

## Stap 7 — Test of het werkt

Open een terminal en draai:

```bash
curl -s -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" \
  "https://$SHOPIFY_STORE_URL/admin/api/2024-10/shop.json"
```

Verwacht resultaat: JSON response met de shop info (name, email, domain, currency EUR, etc.). Als je een `401 Unauthorized` krijgt → token is fout of scopes niet goed ingesteld. Opnieuw stap 5.

Tweede test — laatste 5 orders:
```bash
curl -s -H "X-Shopify-Access-Token: $SHOPIFY_ACCESS_TOKEN" \
  "https://$SHOPIFY_STORE_URL/admin/api/2024-10/orders.json?limit=5&status=any"
```

Als je orders terugkrijgt → alles werkt, je bent klaar.

---

## Stap 8 — Koppel aan Claude Code MCP

In `~/.claude/mcp.json` (of het bamboo-project MCP config, afhankelijk van hoe install.sh het heeft gezet) staat een Shopify MCP block. Check dat `SHOPIFY_ACCESS_TOKEN` en `SHOPIFY_STORE_URL` vanuit .env worden ingelezen.

Herstart Claude Code. Test met:
```
/store-page-audit "https://bamboodisposables.nl/products/ongebleekt-3-laags-48"
```

Als dit draait en de pagina content pullt → alles staat.

---

## Veiligheid

- **Roteer het token** elke 6 maanden voor de zekerheid
- Bewaar het token NOOIT in Git — alleen in `.env` (en zorg dat `.env` in `.gitignore` staat)
- Als Nathan iemand extern toegang geeft tot de shop, maak dan een apart token voor die persoon, niet hergebruiken
- `write_products` scope alleen aanzetten als auto-apply echt gewenst is, anders laat uit

---

## Troubleshooting

| Probleem | Oplossing |
|----------|-----------|
| `401 Unauthorized` | Token fout of scopes niet opgeslagen — herinstalleer app |
| `403 Forbidden` | Scope ontbreekt voor die endpoint — Configuration tabblad scope bijzetten |
| `404 Not Found` | Store URL fout — check spelling `bamboodisposables.myshopify.com` |
| Token werkt lokaal, niet in n8n | In n8n moet je de token als credential opslaan, niet als env var inline |
| MCP pakt het niet op | Herstart Claude Code volledig + check `~/.claude/mcp.json` JSON syntax |
