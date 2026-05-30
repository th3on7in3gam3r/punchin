import express from 'express';
import { neon } from '@neondatabase/serverless';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateDayLogs } from './server/validateLogSequence.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3001;

const DB_URL = process.env.DATABASE_URL;
const sql = neon(DB_URL);

// Middleware
app.use(cors());
app.use(express.json());

// Serve the Vite build output (dist/) for all non-API routes
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Create tables if they don't exist (safe to run every time)
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
    const type       = body.type || body.action;
    const locationId = body.locationId;
    const now        = new Date();
    const dateStr    = body.date || now.toISOString().split('T')[0];
    const timestamp  = body.timestamp || now.getTime();
    // Use the client-supplied id if present (edit/save flow), otherwise generate one
    const logId      = body.id || crypto.randomUUID();

    const existing = await sql`
      SELECT id, type, timestamp FROM time_logs WHERE work_day_date = ${dateStr}
    `;
    const merged = existing
      .filter(row => row.id !== logId)
      .map(row => ({ id: row.id, type: row.type, timestamp: row.timestamp }));
    merged.push({ id: logId, type, timestamp });
    const check = validateDayLogs(merged);
    if (!check.valid) {
      return res.status(400).json({ error: check.error });
    }

    // UPSERT — insert new or update existing row by primary key
    await sql`
      INSERT INTO time_logs (id, work_day_date, type, timestamp, location_id)
      VALUES (${logId}, ${dateStr}, ${type}, ${timestamp}, ${locationId || null})
      ON CONFLICT (id) DO UPDATE
        SET type        = EXCLUDED.type,
            timestamp   = EXCLUDED.timestamp,
            location_id = EXCLUDED.location_id
    `;

    res.json({ success: true, message: `Saved ${type}`, date: dateStr });
  } catch (error) {
    console.error("Punch error:", error);
    res.status(500).json({ error: error.message || "Database error" });
  }
});

// DELETE /api/punch/:id - Remove a single time log
app.delete('/api/punch/:id', async (req, res) => {
  try {
    await sql`DELETE FROM time_logs WHERE id = ${req.params.id}`;
    res.json({ success: true });
  } catch (error) {
    console.error('Delete punch error:', error);
    res.status(500).json({ error: error.message || 'Database error' });
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

// DELETE /api/data - Clear all punch logs and settings
app.delete('/api/data', async (req, res) => {
  try {
    await sql`DELETE FROM time_logs`;
    await sql`DELETE FROM app_settings`;
    res.json({ success: true });
  } catch (error) {
    console.error('Clear data error:', error);
    res.status(500).json({ error: error.message || 'Database error' });
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

// POST /api/insights - Gemini proxy (keeps API key server-side)
app.post('/api/insights', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }
  try {
    const { context } = req.body || {};
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a productivity coach. Based on this work data, give ONE concise, actionable insight (2-3 sentences max, friendly tone, include an emoji): ${context}`,
            }],
          }],
        }),
      },
    );
    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(geminiRes.status).json({ error: errText || 'Gemini API error' });
    }
    const data = await geminiRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ text: text?.trim() || null });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: error.message || 'Insights error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// SPA fallback — serve index.html for any non-API route
// This makes React Router and PWA manifest work correctly
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});