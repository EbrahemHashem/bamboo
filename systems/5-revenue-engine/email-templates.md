# Email Templates — Bamboo Revenue Engine

6 Dutch email templates, brand-voice compliant. Elke email haalt minimaal 2 van 3 kernregels: gebruikswaarde / minder verspilling / geen bomen. Geen activist-taal, "je/jij", nuchter-slim.

Gebruik deze als basis in Klaviyo. Merge tags tussen `{{ }}`.

---

## 1. Welcome — na eerste bestelling

**Trigger:** Placed Order #1 (Shopify webhook via Klaviyo)
**Send time:** 1 uur na order confirmation
**Subject:** Welkom bij Bamboo — even wat handige dingen
**Preview:** Je eerste doos is onderweg. Dit krijg je ervoor terug.

---

Hey {{ first_name }},

Je eerste doos Bamboo is onderweg. Goed bezig — serieus.

Korte heads-up over wat je in huis haalt:

- **Meer vellen per rol.** 300 vel (2 laags) of 250 vel (3 laags). Dat is ongeveer 2x wat je gewend bent uit de supermarkt.
- **Langer doen.** Met een doos van {{ order_volume }} rollen zit je weken tot maanden vooruit. Minder bestelmomenten, minder gedoe.
- **Geen bomen gekapt.** Bamboe groeit tot 1 meter per dag — houtvrij papier dat gewoon werkt.

Wat je nog moet weten: het is plasticvrij verpakt en volledig afbreekbaar. De ongebleekte versie is hypoallergeen, dus als iemand in huis gevoelige huid heeft — dat scheelt.

Als je track & trace wilt checken:
{{ tracking_url }}

Vragen? Antwoord gewoon op deze mail, ik lees ze zelf.

Groet,
Nathan
Bamboo Disposables

---

## 2. Aftersales — 3 dagen na ontvangst

**Trigger:** Fulfilled Order + 3 days delay
**Subject:** Alles goed aangekomen?
**Preview:** En een paar tips om er langer mee te doen.

---

Hey {{ first_name }},

Je doos Bamboo is nu een paar dagen binnen. Alles in orde?

Ik stuur dit niet als enquête — alleen even een paar praktische dingen die handig zijn om te weten:

- **Opslag.** Rollen drooghouden. Badkamerkastje of gewoon in de hoek — allebei prima. Geen speciale behandeling.
- **Voorraad trucje.** Pak 2-3 rollen tegelijk uit, laat de rest in de doos. Houdt het stof weg en je ziet in 1 oogopslag hoeveel je nog hebt.
- **Wat je niet merkt:** de rollen zijn plasticvrij verpakt en gaan in de gewone afvalstroom. Scheelt weer een mini-beslissing per week.

Als iets is tegengevallen — aanvoer beschadigd, vel is te dun, wat dan ook — laat het weten. Antwoord op deze mail.

Anders: tot de volgende bestelling. Je hebt nu sowieso {{ order_volume_estimate }} weken ruimte.

Groet,
Nathan

---

## 3. Reorder reminder — 24 rollen (na 50 dagen)

**Trigger:** Custom metric "Reorder Reminder 24" (via n8n reorder trigger)
**Subject:** Je bent er bijna doorheen — 24 rollen raakt op
**Preview:** Bijbestellen voordat je zonder zit.

---

Hey {{ first_name }},

Volgens mijn schatting begint die doos van 24 rollen die je in {{ last_order_month }} bestelde richting het einde te lopen.

Niet stressen — gewoon een heads-up.

Twee opties voor je volgende bestelling:

**Zelfde maat (24 rollen)** — makkelijk, past in elk kastje
{{ product_url_24 }}

**Slimmer: upgrade naar 48 rollen** — dubbel zoveel voorraad, je zit een halfjaar vooruit, en per rol bespaar je. Geen last meer van "hé we zijn er bijna doorheen"-momenten.
{{ product_url_48 }}

Veel van onze klanten stappen na hun eerste 24-doos over naar 48. Eén keer bestellen, veel langer rust.

{{ cta_button_shop }}

Groet,
Nathan

---

## 4. Reorder reminder — 48 rollen (na 110 dagen)

**Trigger:** Custom metric "Reorder Reminder 48"
**Subject:** 48 rollen — tijd om aan te vullen
**Preview:** Wil je hetzelfde of een stap groter?

---

Hey {{ first_name }},

Die doos van 48 rollen begint bijna op te raken (~10 dagen volgens mijn rekenwerk). Perfect moment om opnieuw te bestellen voordat je zonder zit.

Je koos vorige keer {{ last_product_name }}. Drie opties:

1. **Zelfde weer** — bekend terrein, werkt voor jouw huishouden
{{ product_url_same }}

2. **Upgrade naar 96 rollen** — de volledige jaarvoorraad-aanpak. Eén bestelling, klaar tot volgend seizoen. Per rol de beste deal die we doen.
{{ product_url_96 }}

3. **Mixen** — bv. 48 Ongebleekt 3 laags voor dagelijks + 24 Blanc 3 laags voor gasten
{{ shop_url }}

De meeste klanten die tot 48 zijn gekomen zitten uiteindelijk op 96. Minder vaak denken, minder vaak bestellen, zelfde voorraad-rust.

{{ cta_button_shop }}

Groet,
Nathan

---

## 5. Winback — na 180 dagen inactief

**Trigger:** Segment Churned (180d+ geen order)
**Subject:** Een halfjaar geleden — hoe was het?
**Preview:** Eerlijk: ik ben benieuwd waarom je niet terugkwam.

---

Hey {{ first_name }},

Het is precies 6 maanden geleden dat je een doos Bamboo bestelde. Oprecht: ik ben benieuwd wat er gebeurde.

Misschien ben je overgestapt op iets anders. Misschien is het gewoon van je radar gegaan. Allebei prima — geen bijbedoeling.

Maar als je overweegt terug te komen, een paar dingen die veranderd zijn:

- **Snellere levering** — binnen 1-2 werkdagen in huis
- **Hero product** — Ongebleekt 3 laags 48 rollen blijft onze best-lopende: zacht, sterk, natuurlijk beeld
- **Nieuwe volumes** — 96 rollen voor wie echt lang vooruit wil

Als je wilt, 10% korting op je volgende doos met code **WELKOMTERUG10** (werkt tot eind van de maand).
{{ shop_url }}

Als je niet wilt: geen probleem. Antwoord "uit" en ik haal je van de lijst.

Groet,
Nathan

---

## 6. Upsell 24→48 — na 2e bestelling van 24

**Trigger:** Placed Order #2 én product = 24 rollen variant
**Subject:** Je bent nu 2x terug — tijd voor een betere deal?
**Preview:** 48 rollen rekent per gebruik voordeliger uit.

---

Hey {{ first_name }},

Twee bestellingen van 24 rollen — cool, het werkt dus voor je huishouden. Dat is waar ik op hoopte.

Nu een eerlijke vraag: waarom blijf je bij 24?

Als het ruimte is, snap ik dat. Een doos van 48 rollen is ongeveer de hoogte van een kleine verhuisdoos — past nog prima in een berging of trapkast.

Als het budget is, lees dan even door:

- **24 rollen** — kost je ~€{{ price_per_roll_24 }} per rol
- **48 rollen** — kost je ~€{{ price_per_roll_48 }} per rol
- **Dat is {{ savings_percent }}% voordeliger per rol**

En je bespaart een bestelmoment. 24 rollen = ~2 maanden vooruit. 48 rollen = ~4 maanden. Minder vaak denken, minder vaak ontvangen, meer voorraadrust.

{{ product_url_48 }}

Wil je eerst bijpraten? Antwoord op deze mail.

Groet,
Nathan

---

## Check voor publicatie

Voor elke email die in Klaviyo live gaat, check:
- [ ] Geen "u" — alleen "je/jij"
- [ ] Minimaal 2 van 3 kernregels aanwezig (gebruikswaarde / minder verspilling / geen bomen)
- [ ] Geen activist-taal ("red de planeet", "samen", "verantwoordelijkheid", "toekomst van...")
- [ ] Geen Engels (behalve productnamen waar het moet)
- [ ] Geen uitroeptekens in claims
- [ ] Concrete waarde-voordelen vóór duurzaamheidsclaims
- [ ] Max 250 woorden body (lezers scannen)
