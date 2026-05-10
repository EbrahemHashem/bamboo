# KPI Definities — Bamboo Intelligence Engine

Alle KPIs die Engine 6 tracked. Per KPI: naam, formule, drempelwaardes (good/warning/critical) en welke Airtable tabel de bron is.

Thresholds zijn afgestemd op Nederlandse DTC markt, e-commerce + B2B mix van Bamboo. Aangepast worden als de data groeit — dit is versie 1.

---

## 1. Daily Revenue

**Definitie:** Totale omzet op 1 dag, alle kanalen samen.

**Formule:**
```
Daily Revenue = Shopify Revenue + Bol Revenue + B2B Revenue
```

**Bron:** `Daily KPIs` → aggregaat uit Conversion Tracking (Engine 4) + B2B Leads (Engine 5 closed-won).

**Thresholds** (bij doel €50-60k/maand):
| Waarde | Status |
|--------|--------|
| < €500/dag | Critical |
| €500 – €1.000 | Warning |
| €1.000 – €2.000 | Good |
| > €2.000 | Excellent |

---

## 2. ROAS (Return On Ad Spend)

**Definitie:** Hoeveel euro omzet per euro advertentie.

**Formule:**
```
ROAS = Total Revenue / Total Ad Spend
```

**Bron:** `Daily KPIs` (formula field) — berekend uit Ad Variants (Engine 3) spend + Conversion Tracking revenue.

**Thresholds:**
| Waarde | Status |
|--------|--------|
| < 1.5 | Critical (pauzeren of herzien) |
| 1.5 – 2.0 | Warning |
| 2.0 – 3.0 | Good |
| > 3.0 | Excellent |

**Bamboo context:** marges >30% betekent breakeven rond ROAS 2.0 bij blended.

---

## 3. CPA (Cost Per Acquisition)

**Definitie:** Wat kost 1 nieuwe klant aan advertentiebudget.

**Formule:**
```
CPA = Total Ad Spend / New Customers
```

**Bron:** `Daily KPIs` (formula) — Ad Variants spend + Customer Segments (Engine 5) nieuwe klanten.

**Thresholds** (gem. ordervwaarde €35-45):
| Waarde | Status |
|--------|--------|
| > €20 | Critical |
| €15 – €20 | Warning |
| €10 – €15 | Good |
| < €10 | Excellent |

---

## 4. Shopify Conversion Rate

**Definitie:** % webshop-bezoekers dat een order plaatst.

**Formule:**
```
Shopify CR = (Shopify Orders / Shopify Sessions) × 100
```

**Bron:** Conversion Tracking tabel (Engine 4) — aggregatie per dag.

**Thresholds** (NL DTC benchmark):
| Waarde | Status |
|--------|--------|
| < 1.5% | Critical |
| 1.5% – 2.5% | Warning (gemiddeld) |
| 2.5% – 4% | Good |
| > 4% | Excellent |

---

## 5. Repeat Rate

**Definitie:** Aandeel kopers dat >1 keer heeft besteld (in gekozen periode).

**Formule:**
```
Repeat Rate = (Repeat Customers / (New + Repeat Customers)) × 100
```

**Bron:** Customer Segments tabel (Engine 5).

**Thresholds** (toiletpapier = herhaalaankoop-categorie, dus hoger verwacht):
| Waarde | Status |
|--------|--------|
| < 15% | Critical (bindings-probleem) |
| 15% – 25% | Warning (gezond) |
| 25% – 40% | Good |
| > 40% | Excellent |

---

## 6. Email Revenue Share

**Definitie:** % van totale omzet gegenereerd door email flows (welcome, abandoned cart, post-purchase, win-back).

**Formule:**
```
Email Revenue Share = (Email Attributed Revenue / Total Revenue) × 100
```

**Bron:** Email Performance tabel (Engine 5).

**Thresholds** (Klaviyo benchmark e-commerce):
| Waarde | Status |
|--------|--------|
| < 15% | Critical (email niet benut) |
| 15% – 25% | Warning |
| 25% – 35% | Good (doel Bamboo) |
| > 35% | Excellent |

---

## 7. B2B Pipeline Value

**Definitie:** Geschatte jaarwaarde van alle B2B leads in "Engaged", "Proposal", "Negotiation" stages.

**Formule:**
```
Pipeline Value = Σ (Estimated Monthly Value × 12) voor leads in Engaged+ stages
```

**Bron:** B2B Leads tabel (Engine 5).

**Thresholds** (bij doel €50-60k/maand waarvan ~40% B2B):
| Waarde | Status |
|--------|--------|
| < €20.000 | Critical |
| €20k – €50k | Warning |
| €50k – €150k | Good |
| > €150k | Excellent |

---

## 8. Inventory Runway

**Definitie:** Aantal dagen voorraad op basis van huidige verkoopsnelheid. Berekend per SKU, belangrijkste = hero product.

**Formule:**
```
Runway (dagen) = Current Stock / Avg Daily Demand (7-day rolling)
```

**Bron:** Inventory (handmatig of Shopify MCP) + Conversion Tracking voor demand.

**Thresholds:**
| Waarde | Status |
|--------|--------|
| < 14 dagen | Critical (nu bijbestellen) |
| 14 – 30 dagen | Warning (bestellen plannen) |
| 30 – 60 dagen | Good |
| > 60 dagen | Excellent (let op kapitaalbinding) |

---

## 9. Ad Fatigue Score

**Definitie:** Procentuele daling van CTR op een ad vergeleken met 7-daags rolling gemiddelde. Hoge fatigue = creative refresh nodig.

**Formule:**
```
Fatigue Score = ((7-day Rolling CTR - Current CTR) / 7-day Rolling CTR) × 100
```

**Bron:** Ad Variants tabel (Engine 3).

**Thresholds:**
| Waarde | Status |
|--------|--------|
| < 10% | Good (ad is fresh) |
| 10% – 25% | Warning (begint te zakken) |
| 25% – 40% | Critical (refresh plannen) |
| > 40% | Dood (pause of vervangen) |

---

## 10. LTV (Lifetime Value)

**Definitie:** Totale omzet per klant over diens gehele levensduur.

**Formule:**
```
LTV = Σ Order Values per klant / Aantal klanten
```
(gemiddeld over periode sinds eerste order)

**Bron:** Customer Segments tabel (Engine 5).

**Thresholds** (bij AOV €35-45 en repeat categorie):
| Waarde | Status |
|--------|--------|
| < €50 | Critical (eenmalige kopers) |
| €50 – €100 | Warning |
| €100 – €200 | Good |
| > €200 | Excellent |

**Check:** LTV / CAC ratio moet > 3 zijn voor gezonde economics. CAC = CPA + overhead.

---

## Gebruik in dashboards & workflows

- **Daily KPIs tabel** — elk van bovenstaande waardes (1-7) komt hier dagelijks in
- **Anomaly Log** — triggers op overschrijding van Warning/Critical thresholds
- **Strategy Reports** — weekelijkse trends per KPI ivm. vorige week
- **dashboard.html** — toont kleurgecodeerde status per KPI (groen/geel/rood)

---

## Review & aanpassen

Deze thresholds zijn uitgangspunten. Nathan kan ze bijstellen in `kpi-definitions.md` zelf óf via een `Thresholds` tabel in Airtable (optioneel, voor toekomst).

Principe: eerst 30 dagen draaien met huidige baseline, dan pas fine-tunen op basis van echte Bamboo data.
