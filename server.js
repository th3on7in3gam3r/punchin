// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// ======================
// DATABASE SETUP
// ======================
const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
let sql = null;
if (dbUrl) {
      sql = neon(dbUrl);
} else {
      console.warn('WARNING: DATABASE_URL or NETLIFY_DATABASE_URL is not set. API routes will return errors but static assets can still be served.');
}

function requireDb() {
      if (!sql) {
            throw new Error('DATABASE_URL or NETLIFY_DATABASE_URL is required for database connectivity.');
      }
      return sql;
}

function dbConfigError(res) {
      return res.status(500).json({ error: 'Database not configured. Set DATABASE_URL or NETLIFY_DATABASE_URL.' });
}

async function ensureTables() {
      const db = requireDb();
      await db`
            CREATE TABLE IF NOT EXISTS time_logs (
                      id TEXT PRIMARY KEY,
                              work_day_date TEXT NOT NULL,
                                      type TEXT NOT NULL,
                                              timestamp BIGINT NOT NULL,
                                                      location_id TEXT,
                                                              created_at TIMESTAMP DEFAULT NOW()
            );
                `;
      await db`
            CREATE TABLE IF NOT EXISTS app_settings (
                      id TEXT PRIMARY KEY,
                              config JSONB NOT NULL,
                                      updated_at TIMESTAMP DEFAULT NOW()
            );
                `;
      console.log("✅ Tables ensured");
}

// ======================
// API: /api/punch
// ======================
app.all('/api/punch', async (req, res) => {
      if (!sql) {
            return dbConfigError(res);
      }
      await ensureTables();
      const db = requireDb();

        if (req.method === 'POST') {
                try {
                          const { type, action, date, timestamp, locationId } = req.body;
                                const punchType = type || action || 'unknown';
                                      const now = new Date();
                                            const dateStr = date || now.toISOString().split('T')[0];
                                                  const ts = timestamp || now.getTime();
                                                        const id = crypto.randomUUID();

                                                              await db`
                                                                      INSERT INTO time_logs (id, work_day_date, type, timestamp, location_id)
                                                                              VALUES (${id}, ${dateStr}, ${punchType}, ${ts}, ${locationId || null})
                                                                                    `;

                                                                                          res.json({ 
                                                                                                    success: true, 
                                                                                                            message: `Successfully logged ${punchType}`, 
                                                                                                                    date: dateStr 
                                                                                          });
                } catch (err) {
                          console.error("Punch error:", err);
                                res.status(500).json({ error: err.message || "Database error" });
                }
                    return;
        }

          // GET all logs
            if (req.method === 'GET') {
                    try {
                              const logs = await db`SELECT * FROM time_logs ORDER BY timestamp ASC`;
                                    res.json({ logs });
                    } catch (err) {
                              res.status(500).json({ error: err.message });
                    }
                        return;
            }

              res.status(405).json({ error: "Method not allowed" });
});

app.all('/api/settings', async (req, res) => {
      if (!sql) {
            return dbConfigError(res);
      }
      await ensureTables();
      const db = requireDb();

      if (req.method === 'GET') {
            try {
                  const rows = await db`SELECT config FROM app_settings WHERE id = 'default' LIMIT 1`;
                  const config = rows?.[0]?.config || null;
                  return res.json({ config });
            } catch (err) {
                  console.error('Settings GET error:', err);
                  return res.status(500).json({ error: err.message || 'Database error' });
            }
      }

      if (req.method === 'POST') {
            try {
                  const config = req.body || {};
                  await db`
                        INSERT INTO app_settings (id, config, updated_at)
                        VALUES ('default', ${config}, NOW())
                        ON CONFLICT (id) DO UPDATE
                        SET config = EXCLUDED.config,
                            updated_at = NOW();
                  `;
                  return res.json({ success: true });
            } catch (err) {
                  console.error('Settings POST error:', err);
                  return res.status(500).json({ error: err.message || 'Database error' });
            }
      }

      return res.status(405).json({ error: 'Method not allowed' });
});

// ======================
// SERVE REACT FRONTEND (This fixes the blank page)
// ======================
const distPath = path.join(__dirname, 'dist');

// Serve static assets (JS, CSS, images)
app.use(express.static(distPath));

// Catch-all route for React Router / SPA (very important!)
app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
});

// ======================
// START SERVER
// ======================
app.listen(PORT, () => {
      console.log(`🚀 Punchin server running on port ${PORT}`);
        console.log(`   Frontend → http://localhost:${PORT}`);
          console.log(`   API      → http://localhost:${PORT}/api/punch`);
});
