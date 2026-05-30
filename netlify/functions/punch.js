import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DB_URL);

function validateDayLogs(logs) {
  if (!logs?.length) return { valid: true };
  const sorted = [...logs].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  let state = 'out';
  for (const log of sorted) {
    const type = log.type;
    if (type === 'clock_in') {
      if (state === 'in' || state === 'break') return { valid: false, error: 'Cannot clock in while already on shift' };
      state = 'in';
    } else if (type === 'break_start') {
      if (state !== 'in') return { valid: false, error: 'Break start requires an active shift' };
      state = 'break';
    } else if (type === 'break_end') {
      if (state !== 'break') return { valid: false, error: 'Break end requires a break start' };
      state = 'in';
    } else if (type === 'clock_out') {
      if (state === 'out') return { valid: false, error: 'Cannot clock out when not on shift' };
      if (state === 'break') return { valid: false, error: 'End break before clocking out' };
      state = 'out';
    }
  }
  return { valid: true };
}

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS time_logs (
      id TEXT PRIMARY KEY,
      work_day_date TEXT NOT NULL,
      type TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      location_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
}

export default async (req) => {
  await ensureTables();

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const type = body.type || body.action;
      const locationId = body.locationId;
      const now = new Date();
      const dateStr = body.date || now.toISOString().split('T')[0];
      const timestamp = body.timestamp || now.getTime();
      const logId = body.id || crypto.randomUUID();

      const existing = await sql`
        SELECT id, type, timestamp FROM time_logs WHERE work_day_date = ${dateStr}
      `;
      const merged = existing
        .filter(row => row.id !== logId)
        .map(row => ({ id: row.id, type: row.type, timestamp: row.timestamp }));
      merged.push({ id: logId, type, timestamp });
      const check = validateDayLogs(merged);
      if (!check.valid) {
        return new Response(JSON.stringify({ error: check.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await sql`
        INSERT INTO time_logs (id, work_day_date, type, timestamp, location_id)
        VALUES (${logId}, ${dateStr}, ${type}, ${timestamp}, ${locationId || null})
        ON CONFLICT (id) DO UPDATE
          SET type = EXCLUDED.type,
              timestamp = EXCLUDED.timestamp,
              location_id = EXCLUDED.location_id
      `;

      return new Response(
        JSON.stringify({ success: true, message: `Saved ${type}`, date: dateStr }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    } catch (error) {
      console.error('Punch function error:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Database error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
  }

  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url);
      const segments = url.pathname.split('/').filter(Boolean);
      const logId = segments[segments.length - 1];
      if (!logId || logId === 'punch') {
        return new Response(JSON.stringify({ error: 'Log id required' }), { status: 400 });
      }
      await sql`DELETE FROM time_logs WHERE id = ${logId}`;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  if (req.method === 'GET') {
    try {
      const logs = await sql`SELECT * FROM time_logs ORDER BY timestamp ASC`;
      return new Response(JSON.stringify({ logs }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
};
