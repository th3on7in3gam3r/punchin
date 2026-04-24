// server.ts
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

console.log("Current directory:", __dirname);
const distPath = path.join(__dirname, 'dist');
console.log("Looking for dist folder at:", distPath);

if (fs.existsSync(distPath)) {
  console.log("✅ dist folder found");
} else {
  console.log("❌ dist folder NOT found! Build probably failed.");
}

const DB_URL = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
let pool: any = null;

function getPool() {
  if (!pool) {
    if (!DB_URL) {
      throw new Error("DATABASE_URL or NETLIFY_DATABASE_URL is required");
    }
    pool = new Pool({
      connectionString: DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
}

async function ensureTables() {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_logs (
        id TEXT PRIMARY KEY,
        work_day_date TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        location_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY,
        config JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ Tables ensured");
  } finally {
    client.release();
  }
}

app.all('/api/punch', async (req, res) => {
  if (!DB_URL) {
    return res.status(500).json({ error: 'Database not configured. Set DATABASE_URL or NETLIFY_DATABASE_URL.' });
  }

  try {
    await ensureTables();

    if (req.method === 'POST') {
      const { type, action, date, timestamp, locationId } = req.body;
      const punchType = type || action || 'unknown';
      const now = new Date();
      const dateStr = date || now.toISOString().split('T')[0];
      const ts = timestamp || now.getTime();
      const id = crypto.randomUUID();

      const client = await getPool().connect();
      try {
        await client.query(
          `INSERT INTO time_logs (id, work_day_date, type, timestamp, location_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, dateStr, punchType, ts, locationId || null]
        );
      } finally {
        client.release();
      }

      return res.json({ success: true, message: `Successfully logged ${punchType}`, date: dateStr });
    }

    if (req.method === 'GET') {
      const client = await getPool().connect();
      try {
        const result = await client.query('SELECT * FROM time_logs ORDER BY timestamp ASC');
        return res.json({ logs: result.rows });
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/punch error:', error);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
});

app.all('/api/settings', async (req, res) => {
  if (!DB_URL) {
    return res.status(500).json({ error: 'Database not configured. Set DATABASE_URL or NETLIFY_DATABASE_URL.' });
  }

  try {
    await ensureTables();

    if (req.method === 'GET') {
      const client = await getPool().connect();
      try {
        const result = await client.query("SELECT config FROM app_settings WHERE id = 'default' LIMIT 1");
        const config = result.rows[0]?.config || null;
        return res.json({ config });
      } finally {
        client.release();
      }
    }

    if (req.method === 'POST') {
      const config = req.body || {};
      const client = await getPool().connect();
      try {
        await client.query(
          `INSERT INTO app_settings (id, config, updated_at)
           VALUES ('default', $1, NOW())
           ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
          [config]
        );
      } finally {
        client.release();
      }
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/settings error:', error);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
});

app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send('<h1>dist/index.html not found</h1><p>Build failed or path wrong.</p>');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
