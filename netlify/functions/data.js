import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DB_URL);

export default async (req) => {
  if (req.method !== 'DELETE') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    await sql`DELETE FROM time_logs`;
    await sql`DELETE FROM app_settings`;
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Clear data error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Database error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
