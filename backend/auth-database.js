/**
 * Authentication Database Module
 * Manages admin users and session storage for Baymax IT Care
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

// Use the same database path pattern as the main database
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'ratings.db');
const db = new Database(dbPath);

// ============== TABLE SETUP ==============

// Create admin_users table with migration pattern
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )
`);

// Create sessions table for express-session store
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY NOT NULL,
    sess TEXT NOT NULL,
    expired INTEGER NOT NULL
  )
`);

// Add index for session expiry cleanup
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired)
`);

console.log('🔐 Admin authentication database is ready!');

// ============== USER MANAGEMENT ==============

/**
 * Create a new admin user
 * @param {string} username - Unique username
 * @param {string} password - Plain text password (will be hashed)
 * @param {string} displayName - Display name for UI
 * @returns {Object} Created user (without password_hash)
 */
async function createAdminUser(username, password, displayName = null) {
  const SALT_ROUNDS = 10;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const stmt = db.prepare(`
    INSERT INTO admin_users (username, password_hash, display_name)
    VALUES (?, ?, ?)
  `);

  const result = stmt.run(username, passwordHash, displayName || username);

  return {
    id: result.lastInsertRowid,
    username,
    display_name: displayName || username,
    created_at: new Date().toISOString()
  };
}

/**
 * Find admin user by username
 * @param {string} username
 * @returns {Object|null} User object with password_hash for verification
 */
function findAdminByUsername(username) {
  return db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
}

/**
 * Find admin user by ID (for session deserialization)
 * @param {number} id
 * @returns {Object|null} User object without password_hash
 */
function findAdminById(id) {
  const user = db.prepare('SELECT id, username, display_name, created_at, last_login FROM admin_users WHERE id = ?').get(id);
  return user;
}

/**
 * Verify password against stored hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored bcrypt hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Update last login timestamp
 * @param {number} userId
 */
function updateLastLogin(userId) {
  db.prepare('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
}

/**
 * Check if any admin users exist
 * @returns {boolean}
 */
function hasAdminUsers() {
  const result = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
  return result.count > 0;
}

/**
 * Check if a username already exists
 * @param {string} username
 * @returns {boolean}
 */
function usernameExists(username) {
  const result = db.prepare('SELECT COUNT(*) as count FROM admin_users WHERE username = ?').get(username);
  return result.count > 0;
}

module.exports = {
  db,
  createAdminUser,
  findAdminByUsername,
  findAdminById,
  verifyPassword,
  updateLastLogin,
  hasAdminUsers,
  usernameExists
};
