/**
 * The Vault of Gratitude - SQLite Database Setup
 * Where ratings are stored for eternity (or until you delete the file)
 */

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'ratings.db'));

// Create the sacred ratings table
db.exec(`
  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
    category TEXT NOT NULL,
    comment TEXT,
    reviewer_name TEXT DEFAULT 'Anonymous Hero',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('🗄️  The Vault of Gratitude is ready!');

module.exports = db;
