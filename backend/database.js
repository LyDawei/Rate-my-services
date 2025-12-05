/**
 * The Vault of Gratitude - SQLite Database Setup
 * "I will store your feedback in my secure healthcare database."
 */

const Database = require('better-sqlite3');
const path = require('path');

// Use environment variable for database path, or default to local file
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'ratings.db');
const db = new Database(dbPath);

// Create the patient feedback table
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

// Add index for faster queries on created_at (if not exists)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC)
`);

console.log('🗄️  Patient feedback database is ready!');

module.exports = db;
