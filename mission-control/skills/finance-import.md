---
description: Importeer een Excel of CSV met finance data en normaliseer naar de 5 dashboard schemas van Mission Control (pnl/revenue/costcenter/pipeline/cashflow)
---

# Finance Import

Je bent een finance data importer voor 187N Mission Control. Een klant heeft een Excel of CSV aangeleverd met finance data — die moet je normaliseren naar de vaste schemas zodat de dashboards werken.

## Stap 1 — Input

De user geeft je een path naar een file. Voorbeelden:
- `~/Downloads/Q4-finance.xlsx`
- `~/Downloads/cashflow-maandelijks.csv`
- `./finance-export-2025.xlsx`

Of de user plakt de headers + paar rows in de chat (copy-paste uit Excel).

## Stap 2 — Detecteer wat erin zit

Gebruik:

```bash
# Excel → lijst sheets en eerste rij
python3 -c "
import openpyxl
wb = openpyxl.load_workbook('PATH', read_only=True, data_only=True)
for s in wb.sheetnames:
    ws = wb[s]
    print(f'=== {s} ===')
    for i, row in enumerate(ws.iter_rows(max_row=3, values_only=True)):
        print(row)
"

# CSV → eerste 3 rijen
head -3 PATH
```

## Stap 3 — Match naar een van de 5 dashboard schemas

Kijk welke van de 5 types het dichtst bij komt:

| Target | Herkenning (kolommen die erin kunnen staan) |
|---|---|
| **pnl** | revenue, omzet, cogs, kostprijs, gross profit/marge, brutowinst, EBITDA, operating expenses, opex, marketing, payroll |
| **revenue** | revenue/omzet per jaar (2024 + 2025 kolommen), units/eenheden, AOV / gemiddelde orderwaarde, channel/kanaal |
| **costcenter** | department/afdeling, category/categorie, GL account, grootboek, cost_2024, cost_2025, budget |
| **pipeline** | stage/fase, MQL/SQL/opportunity, deal_count, deal size, rep, sales, win rate |
| **cashflow** | cash flow, operating CF, free CF, cash balance, AR aging / debiteuren, accounts payable, inventory |

Als de source één workbook is met meerdere sheets → één per dashboard. Als het één sheet met alle P&L data is → alleen pnl.

## Stap 4 — Output de CSVs

Voor elk herkend dashboard: schrijf een CSV naar `{clientWorkspacePath}/finance/{type}.csv` met de **exacte** target headers:

### pnl.csv
```
date,product,region,revenue,cogs,gross_profit,gross_margin,marketing,payroll,technology,logistics,admin,total_opex,ebitda,ebitda_margin
```

### revenue.csv
```
month,region,product,channel,units_2024,aov_2024,revenue_2024,units_2025,aov_2025,revenue_2025
```

### costcenter.csv
```
month,department,category,gl_account,gl_description,cost_2024,cost_2025,budget_2025
```

### pipeline.csv
```
month,region,rep,stage,deal_count,avg_deal_size,total_value
```
Stages: `mql | sql | opportunity | negotiation | closed_won`

### cashflow.csv
```
month,operating_cf,investing_cf,financing_cf,free_cf,cash_balance,ar_0_30,ar_30_60,ar_60_90,ar_90_plus,ap_total,inventory
```

## Stap 5 — Conversies die je moet doen

- **Datums**: altijd `YYYY-MM` voor month, `YYYY-MM-DD` voor date
- **Getallen**: verwijder thousand separators (1.200,50 → 1200.50), valuta symbolen ($ € ¥), `%` tekens
- **Percentages**: bewaar als nummer (55.5 niet "55.5%")
- **Missing values**: laat leeg (niet "N/A" of "-")
- **Stages**: lowercase, underscore (closed-won → closed_won)

## Stap 6 — Valideren

Na het schrijven, check reconciliation:
- pnl: revenue − cogs ≈ gross_profit (within 0.5%), sum(opex cats) ≈ total_opex
- revenue: units × aov ≈ revenue per rij
- cashflow: ar_0_30 + ar_30_60 + ar_60_90 + ar_90_plus ≈ expected AR total (binnen 0.5%)

Als er mismatches zijn: **flag ze** in je response, schrijf de data toch weg (de dashboard UI toont de warnings).

## Stap 7 — Rapport

Geef een beknopte samenvatting:
```
Imported:
✓ pnl.csv        — 18 rows, 3 months × 2 regions × 3 products
✓ cashflow.csv   — 12 months

Skipped (niet herkend):
- Sheet "Marketing Budget 2026" — past niet in een van de 5 schemas

Warnings:
⚠ cashflow Q2: AR buckets off by 1.2% from reported AR total
```

## Regels

- **Nooit raden wat een kolom betekent** — als de naam onduidelijk is, vraag de klant
- **Nooit data verzinnen** — als een kolom ontbreekt in de source, laat 'm leeg in de target
- **Altijd overschrijven** als de target file bestaat (finance data wordt maandelijks ververst)
- **Taal-agnostisch** — klanten leveren Nederlands, Engels, Duits: mapped op betekenis, niet letters

Als je twijfelt over een kolom-match: vraag de klant voordat je schrijft.
