// netlify/functions/punch.ts
import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DB_URL);

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

export default async (req) => {
  // Ensure tables exist
  await ensureTables();

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const type = body.type || body.action; // Support both names
      const locationId = body.locationId;

      const now = new Date();
      const dateStr = body.date || now.toISOString().split('T')[0]; // yyyy-mm-dd
      const timestamp = body.timestamp || now.getTime();
      const logId = crypto.randomUUID();

      // Insert the new time log
      await sql`
        INSERT INTO time_logs (id, work_day_date, type, timestamp, location_id)
        VALUES (${logId}, ${dateStr}, ${type}, ${timestamp}, ${locationId || null})
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

    } catch (error) {
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
      const logs = await sql`
        SELECT * FROM time_logs 
        ORDER BY timestamp ASC
      `;

      return new Response(JSON.stringify({ logs }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
};