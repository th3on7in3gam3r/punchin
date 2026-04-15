import express from 'express';
import { neon } from '@neondatabase/serverless';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const DB_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_vx7qg5wXrGMS@ep-orange-pond-ajpwspnt-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DB_URL);

// Middleware
app.use(cors());
app.use(express.json());

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
      type TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      location_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      config JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
}

// Initialize tables on startup
ensureTables().catch(console.error);

// Routes

// POST /api/punch - Log a time entry
app.post('/api/punch', async (req, res) => {
  try {
    const body = req.body;
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

    res.json({
      success: true,
      message: `Successfully logged ${type}`,
      date: dateStr
    });

  } catch (error) {
    console.error("Punch error:", error);
    res.status(500).json({ error: error.message || "Database error" });
  }
});

// GET /api/punch - Get all time logs
app.get('/api/punch', async (req, res) => {
  try {
    const logs = await sql`
      SELECT * FROM time_logs
      ORDER BY timestamp ASC
    `;

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/settings - Get app settings
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await sql`SELECT config FROM app_settings WHERE id = 'default' LIMIT 1`;
    if (!rows || rows.length === 0) {
      return res.json({ config: null });
    }

    res.json({ config: rows[0].config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/settings - Update app settings
app.post('/api/settings', async (req, res) => {
  try {
    const config = req.body || {};

    await sql`
      INSERT INTO app_settings (id, config, updated_at)
      VALUES ('default', ${config}, NOW())
      ON CONFLICT (id) DO UPDATE
      SET config = EXCLUDED.config,
          updated_at = NOW();
    `;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || String(error) });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});