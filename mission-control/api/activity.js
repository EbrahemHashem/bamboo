/**
 * Vercel serverless function — proxies Airtable BM_Executions table
 * to feed the dashboard's Activity panel with live routine-run data.
 *
 * Required Vercel env vars:
 *   AIRTABLE_API_KEY     Airtable personal access token (read scope on the bamboo base)
 *   AIRTABLE_BASE_ID     Bamboo Airtable base ID
 *
 * Optional:
 *   AIRTABLE_TABLE       Override table name (default: Executions)
 *   ACTIVITY_MAX         Max records to return (default: 20)
 *   ROUTINE_PREFIX       Filter routines by name prefix (default: bm-)
 */

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const token = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID || process.env.BM_AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE || 'Executions';
  const max = parseInt(process.env.ACTIVITY_MAX || '20', 10);
  const prefix = process.env.ROUTINE_PREFIX || 'bm-';

  if (!token || !baseId) {
    return res.status(200).json({
      events: [],
      _error: 'Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID env var on Vercel.',
    });
  }

  const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`);
  url.searchParams.set('maxRecords', String(max));
  url.searchParams.append('sort[0][field]', 'timestamp');
  url.searchParams.append('sort[0][direction]', 'desc');
  if (prefix) {
    url.searchParams.set('filterByFormula', `OR(LEFT({routine_name}, ${prefix.length})='${prefix}', LEFT({routine_name}, ${prefix.length})='${prefix.replace(/-$/, '_')}')`);
  }

  try {
    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) {
      const body = await r.text();
      return res.status(200).json({
        events: [],
        _error: `Airtable ${r.status}: ${body.slice(0, 200)}`,
      });
    }

    const data = await r.json();
    const events = (data.records || []).map(rec => {
      const f = rec.fields || {};
      const status = f.status || 'unknown';
      const routine = f.routine_name || 'routine';
      const recs = f.records_written;
      const summary = f.summary || '';

      const icon = status === 'error' ? '⚠'
                 : status === 'success' ? '✓'
                 : status === 'empty' ? '○'
                 : '·';

      const meta = recs !== undefined ? `${recs} rec` : '';

      return {
        type: status,
        icon,
        text: `<strong>${routine}</strong> ${summary ? summary.slice(0, 120) : ''}`,
        meta,
        time: relativeTime(f.timestamp || rec.createdTime),
        timestamp: f.timestamp || rec.createdTime,
        id: rec.id,
      };
    });

    return res.status(200).json({
      events,
      _live: true,
      _fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(200).json({
      events: [],
      _error: `Fetch failed: ${err.message}`,
    });
  }
};

function relativeTime(iso) {
  if (!iso) return 'unknown';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return iso;
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
