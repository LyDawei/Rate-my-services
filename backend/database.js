/**
 * The Vault of Gratitude - SQLite Database Setup
 * "I will store your feedback in my secure healthcare database."
 */

const Database = require('better-sqlite3');
const path = require('path');

// Use environment variable for database path, or default to local file
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'ratings.db');
const db = new Database(dbPath);

// Create the patient feedback table (base schema without new columns for migration compatibility)
db.exec(`
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
    category TEXT NOT NULL,
    comment TEXT,
    reviewer_name TEXT DEFAULT 'Anonymous Patient',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration: Add columns for follow-up questions if they don't exist
// This handles both new databases and existing databases
function runMigration(sql, description) {
  try {
    db.exec(sql);
    console.log(`  ✅ Migration: ${description}`);
  } catch (e) {
    // SQLite error "duplicate column name" indicates column exists - this is expected
    if (e.message && e.message.includes('duplicate column name')) {
      // Column already exists, this is fine
    } else {
      // Unexpected error - log it but don't crash
      console.error(`  ⚠️  Migration warning (${description}):`, e.message);
    }
  }
}

runMigration(
  `ALTER TABLE ratings ADD COLUMN resolves_issue INTEGER DEFAULT NULL`,
  'Add resolves_issue column'
);
runMigration(
  `ALTER TABLE ratings ADD COLUMN issue_recurrence INTEGER DEFAULT NULL`,
  'Add issue_recurrence column'
);

// Add index for faster queries on created_at (if not exists)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC)
`);

console.log('🗄️  Patient feedback database is ready!');

module.exports = db;
