/**
 * Authentication Database Module
 * Manages admin users and login attempts for Baymax IT Care
 */

const { pool } = require('./database');
const bcrypt = require('bcrypt');

// Security constants
const SALT_ROUNDS = 12; // OWASP recommended minimum
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Pre-computed dummy hash for constant-time comparison when user doesn't exist
// This prevents timing attacks that could enumerate valid usernames
// Generated with: bcrypt.hashSync('dummy_password_that_will_never_match', 12)
const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qkAJcmai';

/**
 * Initialize auth database tables
 */
async function initializeAuthDatabase() {
  const client = await pool.connect();
  try {
    // Create admin_users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      )
    `);

    // Create login_attempts table for account-level lockout
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        ip_address TEXT,
        attempted_at TIMESTAMP DEFAULT NOW(),
        success INTEGER DEFAULT 0
      )
    `);

    // Add indexes for login attempts
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username, attempted_at)
    `);

    console.log('Admin authentication database is ready!');
  } finally {
    client.release();
  }
}

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

  const result = await pool.query(
    `INSERT INTO admin_users (username, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, username, display_name, created_at`,
    [username, passwordHash, displayName || username]
  );

  return result.rows[0];
}

/**
 * Find admin user by username
 * @param {string} username
 * @returns {Object|null} User object with password_hash for verification
 */
async function findAdminByUsername(username) {
  const result = await pool.query(
    'SELECT * FROM admin_users WHERE username = $1',
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Find admin user by ID (for session deserialization)
 * @param {number} id
 * @returns {Object|null} User object without password_hash
 */
async function findAdminById(id) {
  const result = await pool.query(
    'SELECT id, username, display_name, created_at, last_login FROM admin_users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
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
  const user = await findAdminByUsername(username);

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
async function updateLastLogin(userId) {
  await pool.query(
    'UPDATE admin_users SET last_login = NOW() WHERE id = $1',
    [userId]
  );
}

/**
 * Check if any admin users exist
 * @returns {boolean}
 */
async function hasAdminUsers() {
  const result = await pool.query('SELECT COUNT(*) as count FROM admin_users');
  return parseInt(result.rows[0].count, 10) > 0;
}

/**
 * Check if a username already exists
 * @param {string} username
 * @returns {boolean}
 */
async function usernameExists(username) {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM admin_users WHERE username = $1',
    [username]
  );
  return parseInt(result.rows[0].count, 10) > 0;
}

// ============== ACCOUNT LOCKOUT ==============

/**
 * Record a login attempt
 * @param {string} username
 * @param {string} ipAddress
 * @param {boolean} success
 */
async function recordLoginAttempt(username, ipAddress, success) {
  await pool.query(
    `INSERT INTO login_attempts (username, ip_address, success)
     VALUES ($1, $2, $3)`,
    [username, ipAddress, success ? 1 : 0]
  );
}

/**
 * Get the count of recent failed login attempts for a username
 * @param {string} username
 * @returns {number} Count of failed attempts in the lockout window
 */
async function getRecentFailedAttempts(username) {
  const lockoutMinutes = LOCKOUT_DURATION_MS / (60 * 1000);
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM login_attempts
     WHERE username = $1 AND success = 0 AND attempted_at > NOW() - INTERVAL '${lockoutMinutes} minutes'`,
    [username]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Check if an account is locked due to too many failed attempts
 * @param {string} username
 * @returns {{locked: boolean, remainingAttempts: number, lockoutEndsAt: Date|null}}
 */
async function isAccountLocked(username) {
  const failedAttempts = await getRecentFailedAttempts(username);
  const locked = failedAttempts >= MAX_FAILED_ATTEMPTS;

  if (locked) {
    // Find the oldest failed attempt in the window to calculate lockout end
    const lockoutMinutes = LOCKOUT_DURATION_MS / (60 * 1000);
    const result = await pool.query(
      `SELECT attempted_at FROM login_attempts
       WHERE username = $1 AND success = 0 AND attempted_at > NOW() - INTERVAL '${lockoutMinutes} minutes'
       ORDER BY attempted_at ASC
       LIMIT 1`,
      [username]
    );

    const oldestAttempt = result.rows[0];
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
async function clearFailedAttempts(username) {
  await pool.query(
    'DELETE FROM login_attempts WHERE username = $1 AND success = 0',
    [username]
  );
}

/**
 * Cleanup old login attempt records (older than 24 hours)
 */
async function cleanupOldLoginAttempts() {
  await pool.query(
    `DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours'`
  );
}

module.exports = {
  initializeAuthDatabase,
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
