import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DB_URL);

async function ensureSettingsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      config JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
}

export default async (req) => {
  await ensureSettingsTable();

  if (req.method === 'GET') {
    const rows = await sql`SELECT config FROM app_settings WHERE id = 'default' LIMIT 1`;
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ config: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ config: rows[0].config }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'POST') {
    try {
      const payload = await req.json();
      const config = payload || {};

      await sql`
        INSERT INTO app_settings (id, config, updated_at)
        VALUES ('default', ${config}, NOW())
        ON CONFLICT (id) DO UPDATE
        SET config = EXCLUDED.config,
            updated_at = NOW();
      `;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: error.message || String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
};