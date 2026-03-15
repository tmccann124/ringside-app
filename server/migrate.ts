/**
 * Migration script — creates/updates tables based on the Drizzle schema.
 * Run on first deploy and after any schema changes.
 * Usage: DATABASE_URL=postgres://... npx tsx server/migrate.ts
 */
import { pool, db } from "./db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Running migrations...");

  // Create tables if they don't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS shows (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      organizer_id VARCHAR NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      start_date TEXT,
      end_date TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS staff_assignments (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      show_id VARCHAR NOT NULL,
      user_id VARCHAR NOT NULL,
      ring_id VARCHAR,
      role TEXT NOT NULL DEFAULT 'ring_operator'
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rings (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      show_id VARCHAR NOT NULL,
      name TEXT NOT NULL,
      discipline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'showing',
      hold_reason TEXT,
      current_class_name TEXT,
      current_class_number INTEGER DEFAULT 1,
      total_classes INTEGER DEFAULT 1,
      trips_completed INTEGER DEFAULT 0,
      total_trips INTEGER DEFAULT 0,
      next_class_name TEXT,
      sort_order INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS classes (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      ring_id VARCHAR NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      total_trips INTEGER DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS activities (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      ring_id VARCHAR NOT NULL,
      message TEXT NOT NULL,
      time TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS follows (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL,
      ring_id VARCHAR NOT NULL,
      alert_class_nearby BOOLEAN DEFAULT false,
      alert_schooling_starts BOOLEAN DEFAULT false,
      alert_ring_resumes BOOLEAN DEFAULT false
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL UNIQUE,
      stripe_customer_id TEXT NOT NULL,
      stripe_subscription_id TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'active',
      current_period_end TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Add indexes for common queries
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_shows_organizer ON shows(organizer_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_rings_show ON rings(show_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_classes_ring ON classes(ring_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_activities_ring ON activities(ring_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_follows_user ON follows(user_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_follows_ring ON follows(ring_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_staff_show ON staff_assignments(show_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_staff_user ON staff_assignments(user_id)`);

  console.log("Migrations complete — all tables and indexes created.");
  await pool.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
