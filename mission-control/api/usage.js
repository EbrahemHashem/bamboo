/**
 * Vercel serverless function — aggregates Airtable BM_Executions to power
 * the dashboard's Usage page with real routine-run statistics.
 *
 * Required env vars (same as /api/activity):
 *   AIRTABLE_API_KEY
 *   AIRTABLE_BASE_ID
 *
 * Optional:
 *   AIRTABLE_TABLE       (default: Executions)
 *   USAGE_WINDOW_DAYS    (default: 30 — how far back to aggregate)
 *   ROUTINE_PREFIX       Filter by routine name prefix (default: bm-)
 */

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const token = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID || process.env.BM_AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE || 'Executions';
  const windowDays = parseInt(process.env.USAGE_WINDOW_DAYS || '30', 10);
  const prefix = process.env.ROUTINE_PREFIX || 'bm-';

  if (!token || !baseId) {
    return res.status(200).json({
      _error: 'Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID env var on Vercel.',
      tokensToday: 0, callsToday: 0, sessionsToday: 0, byAgent: [],
    });
  }

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  // Paginate to grab everything in the window
  const records = [];
  let offset;
  try {
    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`);
      url.searchParams.set('pageSize', '100');
      const filter = prefix
        ? `AND(IS_AFTER({timestamp}, '${since}'), LEFT({routine_name}, ${prefix.length})='${prefix}')`
        : `IS_AFTER({timestamp}, '${since}')`;
      url.searchParams.set('filterByFormula', filter);
      if (offset) url.searchParams.set('offset', offset);

      const r = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const body = await r.text();
        return res.status(200).json({
          _error: `Airtable ${r.status}: ${body.slice(0, 200)}`,
          tokensToday: 0, callsToday: 0, sessionsToday: 0, byAgent: [],
        });
      }
      const data = await r.json();
      records.push(...(data.records || []));
      offset = data.offset;
    } while (offset);
  } catch (err) {
    return res.status(200).json({
      _error: `Fetch failed: ${err.message}`,
      tokensToday: 0, callsToday: 0, sessionsToday: 0, byAgent: [],
    });
  }

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  let callsToday = 0;
  let errorsToday = 0;
  let recordsTodayTotal = 0;
  const sessionsToday = new Set();
  const byRoutine = {};

  for (const rec of records) {
    const f = rec.fields || {};
    const ts = new Date(f.timestamp || rec.createdTime).getTime();
    const routine = f.routine_name || 'unknown';
    const status = f.status || 'unknown';
    const recsWritten = Number(f.records_written) || 0;

    if (!byRoutine[routine]) {
      byRoutine[routine] = { name: routine, runs: 0, errors: 0, recordsTotal: 0, lastRun: null };
    }
    const r = byRoutine[routine];
    r.runs += 1;
    if (status === 'error') r.errors += 1;
    r.recordsTotal += recsWritten;
    if (!r.lastRun || ts > new Date(r.lastRun).getTime()) {
      r.lastRun = f.timestamp || rec.createdTime;
    }

    if (ts >= todayMs) {
      callsToday += 1;
      if (status === 'error') errorsToday += 1;
      recordsTodayTotal += recsWritten;
      sessionsToday.add(routine);
    }
  }

  const byAgent = Object.values(byRoutine)
    .map(r => ({
      ...r,
      avgDuration: 0,
      successRate: r.runs ? Math.round(((r.runs - r.errors) / r.runs) * 100) : 0,
    }))
    .sort((a, b) => b.runs - a.runs);

  return res.status(200).json({
    _live: true,
    _fetchedAt: new Date().toISOString(),
    windowDays,
    recordsToday: recordsTodayTotal,
    callsToday,
    errorsToday,
    sessionsToday: sessionsToday.size,
    avgDurationToday: 0,
    totalRuns: records.length,
    byAgent,
  });
};
