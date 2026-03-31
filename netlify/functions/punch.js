// netlify/functions/punch.ts
import { neon } from '@netlify/neon';

const sql = neon();   // Automatically uses NETLIFY_DATABASE_URL from Netlify DB

// Create tables if they don't exist (safe to run every time)
async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS work_days (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      total_work_minutes INTEGER DEFAULT 0,
      total_break_minutes INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS time_logs (
      id TEXT PRIMARY KEY,
      work_day_date TEXT NOT NULL,
      type TEXT NOT NULL,           -- 'clock_in', 'clock_out', 'break_start', 'break_end'
      timestamp BIGINT NOT NULL,
      location_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
}

export default async (req: Request) => {
  // Ensure tables exist
  await ensureTables();

  if (req.method === 'POST') {
    try {
      const { type, locationId } = await req.json();   // type = 'clock_in' | 'clock_out' | etc.

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // yyyy-mm-dd
      const logId = crypto.randomUUID();

      // Insert the new time log
      await sql`
        INSERT INTO time_logs (id, work_day_date, type, timestamp, location_id)
        VALUES (${logId}, ${dateStr}, ${type}, ${now.getTime()}, ${locationId || null})
      `;

      // You can expand this later to also update totals in work_days table

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully logged ${type}`,
          date: dateStr
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error: any) {
      console.error("Punch function error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Database error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }

  // GET request - fetch today's logs (optional for now)
  if (req.method === 'GET') {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const logs = await sql`
        SELECT * FROM time_logs 
        WHERE work_day_date = ${dateStr}
        ORDER BY timestamp ASC
      `;

      return new Response(JSON.stringify({ logs }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};