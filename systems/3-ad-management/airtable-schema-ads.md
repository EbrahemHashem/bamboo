# Airtable Schema — Systeem 3 Ad Management

Extra tabellen bovenop Systeem 1's "Bamboo Ad Research" base.

---

## Table 4: Campaigns

| Field | Type |
|-------|------|
| Campaign ID | singleLineText (primary, Meta campaign ID) |
| Name | singleLineText |
| Product | singleSelect (Ongebleekt 2L 24 / 2L 48 / 2L 96 / Ongebleekt 3L 24 / 3L 48 / 3L 96 / Blanc 3L 24 / 3L 48 / 3L 96) |
| Objective | singleSelect (Conversions, Traffic, Brand Awareness) |
| Status | singleSelect (Draft, Paused, Active, Completed, Archived) |
| Target Audience | singleLineText |
| Angle | singleSelect (Waarde, Comfort, Duurzaam, Voorraadrust, Contrast) |
| Start Date | date |
| Daily Budget | currency |
| Total Spend | currency (formula via Ad Variants rollup) |
| Total Revenue | currency (rollup) |
| Average ROAS | number (rollup) |
| Created By | singleSelect (Nathan, AI System) |
| Notes | longText |

---

## Table 5: Ad Variants

| Field | Type |
|-------|------|
| Ad ID | singleLineText (primary) |
| Ad Name | singleLineText |
| Campaign | multipleRecordLinks (→ Campaigns) |
| Adset Name | singleLineText |
| Hook | longText |
| Body Copy | longText |
| CTA | singleSelect |
| Format | singleSelect (Static, Carousel, Video, DCO) |
| Creative URL | url (Drive link naar static/video) |
| Status | singleSelect (Paused, Active, Disapproved) |
| Launch Date | date |
| Spend | currency |
| Impressions | number |
| Clicks | number |
| CTR | number (%) |
| CPC | currency |
| Conversions | number |
| Revenue | currency |
| ROAS | number (formula: Revenue / Spend) |
| CPA | currency (formula: Spend / Conversions) |
| Winner Status | singleSelect (New, Testing, Winner, Declining, Loser) |
| Last Updated | lastModifiedTime |

---

## Table 6: Performance Rules

Nathan kan deze regels tunen zonder code aan te raken. n8n workflow leest hieruit.

| Field | Type | Default |
|-------|------|---------|
| Rule Name | singleLineText | — |
| Metric | singleSelect (ROAS, CTR, CPC, CPA, Spend) | — |
| Operator | singleSelect (<, >, =) | — |
| Threshold | number | — |
| Additional Condition | singleLineText | `spend > 20` |
| Action | singleSelect (Pause, Scale +20%, Scale +50%, Flag, Alert) | — |
| Active | checkbox | true |
| Notes | longText | — |

**Pre-fill rows** (install script):

| Rule Name | Metric | Operator | Threshold | Condition | Action |
|-----------|--------|----------|-----------|-----------|--------|
| Bad ROAS Pause | ROAS | < | 1.5 | spend > 20 | Pause |
| Winner Scale | ROAS | > | 3.0 | spend < 100 | Scale +20% |
| Low CTR Flag | CTR | < | 0.5 | impressions > 1000 | Flag |
| High CPC Pause | CPC | > | 2.50 | — | Pause |
| High CPA Pause | CPA | > | 15 | conversions > 0 | Pause |

---

## Table 7: Decisions Log

| Field | Type |
|-------|------|
| Timestamp | dateTime |
| Ad ID | singleLineText |
| Ad Name | singleLineText |
| Action | singleSelect (Pause, Scale, Flag, OK) |
| Reason | longText |
| ROAS | number |
| Spend | currency |
| CTR | number |
| CPC | currency |
| New Status | singleLineText |
| Triggered By | singleSelect (Auto Rule, Manual, Nathan) |

---

## Views

### Campaigns views
- **Active**: Status = Active, sorted by Total Spend desc
- **Needs Review**: Status = Draft, Created By = AI System
- **Top Performers**: Average ROAS > 2.5

### Ad Variants views
- **Winners**: Winner Status = Winner, sorted by ROAS desc
- **To Pause**: ROAS < 1.5 AND Spend > €20
- **Creative Refresh Needed**: CTR < 0.5% AND Impressions > 1000
- **Per Campaign** (gegroepeerd)

### Decisions Log views
- **Last 24h**: Timestamp > NOW() - 1 day
- **Auto actions**: Triggered By = Auto Rule
