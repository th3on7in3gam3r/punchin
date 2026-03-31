import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.NETLIFY_DATABASE_URL);

async function init() {
  console.log("Initializing database schema...");
  
  try {
    // Drop existing tables (be careful, but let's assume we're starting fresh)
    /*
    await sql`DROP TABLE IF EXISTS logs`;
    await sql`DROP TABLE IF EXISTS daily_statuses`;
    await sql`DROP TABLE IF EXISTS work_days`;
    await sql`DROP TABLE IF EXISTS locations`;
    await sql`DROP TABLE IF EXISTS reminders`;
    await sql`DROP TABLE IF EXISTS profile`;
    */

    // Create Profile Table
    await sql`
      CREATE TABLE IF NOT EXISTS profile (
        id SERIAL PRIMARY KEY,
        name TEXT,
        employee_id TEXT,
        hourly_rate DECIMAL,
        tax_rate DECIMAL
      )
    `;

    // Create Locations Table
    await sql`
      CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT
      )
    `;

    // Create WorkDays Table
    await sql`
      CREATE TABLE IF NOT EXISTS work_days (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        total_work_minutes DECIMAL DEFAULT 0,
        total_break_minutes DECIMAL DEFAULT 0
      )
    `;

    // Create Logs Table
    await sql`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        day_id TEXT REFERENCES work_days(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        location_id TEXT
      )
    `;

    // Create Reminders Table
    await sql`
      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        type TEXT NOT NULL,
        time TEXT,
        interval_minutes INTEGER,
        days TEXT, -- JSON string of days [0,1,2,3,4,5,6]
        enabled BOOLEAN DEFAULT TRUE,
        sound TEXT,
        last_triggered BIGINT
      )
    `;

    // Create Daily Statuses Table
    await sql`
      CREATE TABLE IF NOT EXISTS daily_statuses (
        date TEXT PRIMARY KEY,
        is_working BOOLEAN DEFAULT TRUE,
        reason TEXT,
        custom_reason TEXT,
        location_id TEXT
      )
    `;

    console.log("Database initialized successfully!");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}

init();
