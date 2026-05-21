#!/usr/bin/env node
/**
 * Seeds mock bm- prefixed routine executions into the shared Airtable
 * Executions table so the dashboard's Activity feed + Usage page populate.
 *
 * Reads AIRTABLE_API_KEY + AIRTABLE_BASE_ID from process.env. Pre-run with:
 *   set -a; source ../../.env; set +a
 * Or:
 *   AIRTABLE_API_KEY=... AIRTABLE_BASE_ID=... node scripts/seed-mock-executions.js
 *
 * Idempotency: not strict — re-running creates duplicates. Pass --dry to preview.
 */

const token = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const table = process.env.AIRTABLE_TABLE || 'Executions';
const dry = process.argv.includes('--dry');

if (!token || !baseId) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID env var');
  process.exit(1);
}

// Realistic bamboo routine fixtures keyed off routines/bm-*.md
const FIXTURES = [
  {
    routine_name: 'bm-competitor-daily-scrape',
    statuses: ['success', 'success', 'success', 'partial', 'success'],
    records: [42, 38, 51, 12, 47],
    summaries: [
      'Scraped 42 ads van 4 concurrenten. 3 nieuwe angles (subscription, prijs, comfort).',
      'Scraped 38 ads. Cheeky Panda nieuwe carousel hook gedetecteerd.',
      'Scraped 51 ads. Who Gives A Crap pushte 12 nieuwe video creatives.',
      'Partial: Apify rate limit op IG — 12 ads gescraped, retry over 1h.',
      'Scraped 47 ads. The Good Roll testte nieuwe TikTok hook.',
    ],
  },
  {
    routine_name: 'bm-daily-intelligence',
    statuses: ['success', 'success', 'success', 'success', 'success'],
    records: [1, 1, 1, 1, 1],
    summaries: [
      'Ochtendbrief gegenereerd. ROAS 2.4, voorraad OK, 3 anomalieën gevlagd.',
      'Ochtendbrief verstuurd. Conversie +12% WoW op hero product.',
      'Brief: 2 routines errored gisteren, 1 reorder trigger geactiveerd.',
      'Brief verzonden. Sessie-naar-checkout +8%, AOV stabiel.',
      'Brief: B2B pipeline +3 leads, geen kritieke anomalieën.',
    ],
  },
  {
    routine_name: 'bm-conversion-monitor',
    statuses: ['success', 'success', 'empty', 'success', 'success', 'success', 'partial'],
    records: [4, 7, 0, 5, 9, 3, 2],
    summaries: [
      '4 productpagina varianten getest. Winnaar: hero waarde-frame +18% CTR.',
      '7 events verwerkt. CTA "Bestel nu" outperformt "Probeer" met 11%.',
      'Geen significant verkeer in laatste 6h — skip.',
      'A/B test geconcludeerd: bundel 48 rollen wint van 24.',
      '9 micro-conversions getrackt. Sub badge boost +6%.',
      'Pricing test: €27 outperforms €29 met 14% CR.',
      'Partial: Shopify rate-limit hit, 2 van 5 tests bijgewerkt.',
    ],
  },
  {
    routine_name: 'bm-ab-test-evaluator',
    statuses: ['success', 'success', 'success'],
    records: [2, 3, 1],
    summaries: [
      'Concludeerde 2 tests. Winnaar gedeployed naar 100% traffic.',
      '3 tests geëvalueerd. 1 inconclusive, 2 winners.',
      'Test "free shipping vs discount" → free shipping wint significant.',
    ],
  },
  {
    routine_name: 'bm-anomaly-detector',
    statuses: ['empty', 'empty', 'success', 'empty', 'success', 'empty', 'error'],
    records: [0, 0, 3, 0, 1, 0, 0],
    summaries: [
      'Geen anomalieën gedetecteerd.',
      'Geen anomalieën gedetecteerd.',
      '3 anomalieën: spike in cart abandonment (+34%), ROAS dip op Ad 7, voorraad SKU-48 onder threshold.',
      'Geen anomalieën gedetecteerd.',
      '1 anomalie: refund rate spike (3.8% vs 1.2% baseline) — Nathan gepingd.',
      'Geen anomalieën gedetecteerd.',
      'Error: Airtable timeout op KPI baseline query.',
    ],
  },
  {
    routine_name: 'bm-retention-flow-monitor',
    statuses: ['success', 'success', 'success'],
    records: [18, 24, 31],
    summaries: [
      '18 klanten in winback flow geplaatst. 4 reactiveerden.',
      '24 churn-risk klanten gescoord. 12 high-risk → Klaviyo flow.',
      '31 klanten gesegmenteerd. VIP tier +5 leden deze week.',
    ],
  },
  {
    routine_name: 'bm-b2b-pipeline',
    statuses: ['success', 'success', 'success', 'empty'],
    records: [3, 5, 2, 0],
    summaries: [
      '3 nieuwe B2B leads (1 hotel, 2 kantoor). Outreach gedraft.',
      '5 follow-ups verstuurd. 2 replies geclassificeerd als interesse.',
      '2 hot leads doorgezet naar Nathan voor demo call.',
      'Geen nieuwe leads vandaag — pipeline rustig.',
    ],
  },
  {
    routine_name: 'bm-reorder-trigger',
    statuses: ['success', 'success', 'partial'],
    records: [2, 0, 1],
    summaries: [
      '2 SKUs onder reorder point: Ongebleekt 3L 48 + Blanc 3L 96. Supplier emails verstuurd.',
      'Alle SKUs boven threshold. Geen actie nodig.',
      'Partial: SMTP error op supplier email Ongebleekt 2L 48 — retry queued.',
    ],
  },
  {
    routine_name: 'bm-ad-performance-loop',
    statuses: ['success', 'success', 'success', 'error'],
    records: [8, 5, 12, 0],
    summaries: [
      '8 ads geanalyseerd. 2 losers gepauzeerd (ROAS < 1.5), 1 winner geschaald +30%.',
      '5 ads beoordeeld. Alle binnen target ROAS, geen actie.',
      '12 ads geëvalueerd. 3 paused, 2 budget verhoogd, 1 nieuwe variant getriggerd.',
      'Error: Meta Ads API 401 — token vervallen, Nathan gepingd.',
    ],
  },
  {
    routine_name: 'bm-weekly-digest',
    statuses: ['success'],
    records: [1],
    summaries: [
      'Weekrapport gegenereerd: ROAS 2.6 (+0.2 WoW), 4 winning ads, 2 churn-risk klanten gered.',
    ],
  },
  {
    routine_name: 'bm-weekly-strategy-report',
    statuses: ['success'],
    records: [1],
    summaries: [
      'Strategierapport: Hero product Ongebleekt 3L 48 = 38% van revenue. Aanbeveling: bundel push naar 96 rollen voor retentie.',
    ],
  },
];

// Spread executions across the last 7 days
function generateRecords() {
  const records = [];
  const now = Date.now();

  for (const fix of FIXTURES) {
    fix.statuses.forEach((status, i) => {
      // Stagger across last 7 days, with multiple per day for high-freq routines
      const hoursAgo = (i + 1) * (fix.statuses.length > 5 ? 8 : 24) + Math.random() * 4;
      const ts = new Date(now - hoursAgo * 60 * 60 * 1000).toISOString();

      records.push({
        fields: {
          routine_name: fix.routine_name,
          status,
          timestamp: ts,
          records_written: fix.records[i] ?? 0,
          summary: fix.summaries[i] ?? '',
        },
      });
    });
  }
  return records;
}

async function postBatch(batch) {
  const r = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ records: batch, typecast: true }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Airtable ${r.status}: ${body}`);
  }
  return r.json();
}

(async () => {
  const all = generateRecords();
  console.log(`Generated ${all.length} mock executions across ${FIXTURES.length} routines`);

  if (dry) {
    console.log('\nDry run — sample records:');
    console.log(JSON.stringify(all.slice(0, 3), null, 2));
    return;
  }

  // Airtable accepts up to 10 records per POST
  let written = 0;
  for (let i = 0; i < all.length; i += 10) {
    const batch = all.slice(i, i + 10);
    const result = await postBatch(batch);
    written += result.records.length;
    process.stdout.write(`  ${written}/${all.length}\r`);
  }
  console.log(`\nSeeded ${written} records into ${table}`);
})().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
