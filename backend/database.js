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
try {
  db.exec(`ALTER TABLE ratings ADD COLUMN resolves_issue INTEGER DEFAULT NULL`);
} catch (e) {
  // Column already exists, ignore
}
try {
  db.exec(`ALTER TABLE ratings ADD COLUMN issue_recurrence INTEGER DEFAULT NULL`);
} catch (e) {
  // Column already exists, ignore
}

// Add index for faster queries on created_at (if not exists)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC)
`);

console.log('🗄️  Patient feedback database is ready!');

module.exports = db;
