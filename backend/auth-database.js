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

// Security constants
const SALT_ROUNDS = 12; // OWASP recommended minimum
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Pre-computed dummy hash for constant-time comparison when user doesn't exist
// This prevents timing attacks that could enumerate valid usernames
// Generated with: bcrypt.hashSync('dummy_password_that_will_never_match', 12)
const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qkAJcmai';

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

// Sessions table setup for express-session store
// CRITICAL: better-sqlite3-session-store expects:
//   - Column name: 'expire' (NOT 'expired')
//   - Column type: TEXT (stores ISO 8601 strings like "2025-12-10T06:57:25.824Z")
//   - Library uses SQLite's datetime() for comparisons
// Reference: node_modules/better-sqlite3-session-store/src/index.js:10-17

// Check if sessions table exists
const sessionsTableExists = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'
`).get();

if (sessionsTableExists) {
  // Table exists - check if it has the wrong column name and migrate if needed
  const tableInfo = db.prepare("PRAGMA table_info(sessions)").all();
  const hasExpiredColumn = tableInfo.some(col => col.name === 'expired');
  const hasExpireColumn = tableInfo.some(col => col.name === 'expire');

  if (hasExpiredColumn && !hasExpireColumn) {
    console.log('🔄 Migrating sessions table: renaming "expired" column to "expire"...');

    // SQLite doesn't support ALTER COLUMN, so we recreate the table
    // Wrap in transaction for atomicity - SQLite auto-rollbacks on error
    try {
      db.exec(`
        BEGIN TRANSACTION;

        -- Create new table with correct schema
        CREATE TABLE sessions_new (
          sid TEXT PRIMARY KEY NOT NULL,
          sess TEXT NOT NULL,
          expire TEXT NOT NULL
        );

        -- Copy data (the 'expired' column stored TEXT despite INTEGER declaration
        -- due to SQLite's dynamic typing, so we just copy the value directly)
        INSERT INTO sessions_new (sid, sess, expire)
        SELECT sid, sess, expired FROM sessions;

        -- Drop old table and index
        DROP INDEX IF EXISTS idx_sessions_expired;
        DROP TABLE sessions;

        -- Rename new table
        ALTER TABLE sessions_new RENAME TO sessions;

        -- Recreate index with correct name
        CREATE INDEX idx_sessions_expire ON sessions(expire);

        COMMIT;
      `);

      console.log('✅ Sessions table migration complete!');
    } catch (error) {
      console.error('❌ Sessions table migration failed:', error.message);
      // Re-throw to prevent app from starting with corrupted state
      throw error;
    }
  }
} else {
  // Table doesn't exist - create it with correct schema
  db.exec(`
    CREATE TABLE sessions (
      sid TEXT PRIMARY KEY NOT NULL,
      sess TEXT NOT NULL,
      expire TEXT NOT NULL
    )
  `);
}

// Ensure index exists (safe to run even if it already exists)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire)
`);

// Create failed login attempts table for account-level lockout
db.exec(`
  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    ip_address TEXT,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success INTEGER DEFAULT 0
  )
`);

// Add indexes for login attempts
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username, attempted_at)
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
 * Verify credentials in constant time to prevent timing attacks
 * Always performs bcrypt comparison even if user doesn't exist
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{valid: boolean, user: Object|null}>}
 */
async function verifyCredentialsConstantTime(username, password) {
  const user = findAdminByUsername(username);

  // Always compare against a hash (real or dummy) to maintain constant time
  // This prevents timing attacks that could enumerate valid usernames
  const hashToCompare = user?.password_hash || DUMMY_HASH;
  const isValid = await bcrypt.compare(password, hashToCompare);

  // Only return valid if BOTH user exists AND password matches
  if (user && isValid) {
    return { valid: true, user };
  }

  return { valid: false, user: null };
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

// ============== ACCOUNT LOCKOUT ==============

/**
 * Record a login attempt
 * @param {string} username
 * @param {string} ipAddress
 * @param {boolean} success
 */
function recordLoginAttempt(username, ipAddress, success) {
  db.prepare(`
    INSERT INTO login_attempts (username, ip_address, success)
    VALUES (?, ?, ?)
  `).run(username, ipAddress, success ? 1 : 0);
}

/**
 * Get the count of recent failed login attempts for a username
 * @param {string} username
 * @returns {number} Count of failed attempts in the lockout window
 */
function getRecentFailedAttempts(username) {
  const windowStart = new Date(Date.now() - LOCKOUT_DURATION_MS).toISOString();
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM login_attempts
    WHERE username = ? AND success = 0 AND attempted_at > ?
  `).get(username, windowStart);
  return result.count;
}

/**
 * Check if an account is locked due to too many failed attempts
 * @param {string} username
 * @returns {{locked: boolean, remainingAttempts: number, lockoutEndsAt: Date|null}}
 */
function isAccountLocked(username) {
  const failedAttempts = getRecentFailedAttempts(username);
  const locked = failedAttempts >= MAX_FAILED_ATTEMPTS;

  if (locked) {
    // Find the oldest failed attempt in the window to calculate lockout end
    const windowStart = new Date(Date.now() - LOCKOUT_DURATION_MS).toISOString();
    const oldestAttempt = db.prepare(`
      SELECT attempted_at FROM login_attempts
      WHERE username = ? AND success = 0 AND attempted_at > ?
      ORDER BY attempted_at ASC
      LIMIT 1
    `).get(username, windowStart);

    const lockoutEndsAt = oldestAttempt
      ? new Date(new Date(oldestAttempt.attempted_at).getTime() + LOCKOUT_DURATION_MS)
      : null;

    return {
      locked: true,
      remainingAttempts: 0,
      lockoutEndsAt
    };
  }

  return {
    locked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - failedAttempts,
    lockoutEndsAt: null
  };
}

/**
 * Clear failed login attempts after successful login
 * @param {string} username
 */
function clearFailedAttempts(username) {
  db.prepare(`
    DELETE FROM login_attempts
    WHERE username = ? AND success = 0
  `).run(username);
}

/**
 * Cleanup old login attempt records (older than 24 hours)
 */
function cleanupOldLoginAttempts() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM login_attempts WHERE attempted_at < ?').run(cutoff);
}

module.exports = {
  db,
  createAdminUser,
  findAdminByUsername,
  findAdminById,
  verifyPassword,
  verifyCredentialsConstantTime,
  updateLastLogin,
  hasAdminUsers,
  usernameExists,
  // Account lockout exports
  recordLoginAttempt,
  getRecentFailedAttempts,
  isAccountLocked,
  clearFailedAttempts,
  cleanupOldLoginAttempts,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS
};
