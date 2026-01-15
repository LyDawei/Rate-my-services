/**
 * The Vault of Gratitude - PostgreSQL Database Setup
 * "I will store your feedback in my secure healthcare database."
 */

const { Pool } = require('pg');

// Create connection pool using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Initialize the database schema
 * Creates tables and runs migrations if needed
 */
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create the patient feedback table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        stars INTEGER NOT NULL CHECK(stars >= 1 AND stars <= 5),
        category TEXT NOT NULL,
        comment TEXT,
        reviewer_name TEXT DEFAULT 'Anonymous Patient',
        resolves_issue INTEGER DEFAULT NULL,
        issue_recurrence INTEGER DEFAULT NULL,
        previous_issue_details TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add index for faster queries on created_at (if not exists)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC)
    `);

    console.log('Patient feedback database is ready!');
  } finally {
    client.release();
  }
}

/**
 * Insert a new rating
 * @param {Object} rating - Rating data
 * @returns {Object} The inserted rating with id
 */
async function insertRating({ stars, category, comment, reviewer_name, resolves_issue, issue_recurrence, previous_issue_details }) {
  const result = await pool.query(
    `INSERT INTO ratings (stars, category, comment, reviewer_name, resolves_issue, issue_recurrence, previous_issue_details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [stars, category, comment, reviewer_name || 'Anonymous Patient', resolves_issue, issue_recurrence, previous_issue_details]
  );
  return result.rows[0];
}

/**
 * Get a rating by ID
 * @param {number} id - Rating ID
 * @returns {Object|null} The rating or null if not found
 */
async function getRatingById(id) {
  const result = await pool.query('SELECT * FROM ratings WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Get ratings with pagination
 * @param {number} limit - Max number of ratings to return
 * @param {number} offset - Number of ratings to skip
 * @returns {Array} Array of ratings
 */
async function getRatings(limit = 20, offset = 0) {
  const result = await pool.query(
    'SELECT * FROM ratings ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
}

/**
 * Get total count of ratings
 * @returns {number} Total count
 */
async function getRatingsCount() {
  const result = await pool.query('SELECT COUNT(*) as count FROM ratings');
  return parseInt(result.rows[0].count, 10);
}

/**
 * Delete a rating by ID
 * @param {number} id - Rating ID
 * @returns {boolean} True if deleted, false if not found
 */
async function deleteRating(id) {
  const result = await pool.query('DELETE FROM ratings WHERE id = $1 RETURNING id', [id]);
  return result.rowCount > 0;
}

/**
 * Get average stars
 * @returns {number} Average stars or 0 if no ratings
 */
async function getAverageStars() {
  const result = await pool.query('SELECT AVG(stars) as avg FROM ratings');
  return parseFloat(result.rows[0].avg) || 0;
}

/**
 * Get category statistics
 * @returns {Array} Category stats with counts and averages
 */
async function getCategoryStats() {
  const result = await pool.query(`
    SELECT category, COUNT(*) as count, AVG(stars) as avg_stars
    FROM ratings
    GROUP BY category
    ORDER BY count DESC
  `);
  return result.rows;
}

/**
 * Get star distribution
 * @returns {Array} Distribution of stars
 */
async function getStarDistribution() {
  const result = await pool.query(`
    SELECT stars, COUNT(*) as count
    FROM ratings
    GROUP BY stars
    ORDER BY stars
  `);
  return result.rows;
}

/**
 * Get count of ratings from the last 7 days
 * @returns {number} Count of recent ratings
 */
async function getRecentRatingsCount() {
  const result = await pool.query(`
    SELECT COUNT(*) as count FROM ratings
    WHERE created_at >= NOW() - INTERVAL '7 days'
  `);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Get issue tracking stats
 * @returns {Object} Counts of resolved, unresolved, and recurring issues
 */
async function getIssueTrackingStats() {
  const [resolved, unresolved, recurring] = await Promise.all([
    pool.query('SELECT COUNT(*) as count FROM ratings WHERE resolves_issue = 1'),
    pool.query('SELECT COUNT(*) as count FROM ratings WHERE resolves_issue = 0'),
    pool.query('SELECT COUNT(*) as count FROM ratings WHERE issue_recurrence = 1')
  ]);

  return {
    resolved: parseInt(resolved.rows[0].count, 10),
    unresolved: parseInt(unresolved.rows[0].count, 10),
    recurring: parseInt(recurring.rows[0].count, 10)
  };
}

/**
 * Test database connection
 * @returns {boolean} True if connected
 */
async function testConnection() {
  const result = await pool.query('SELECT 1');
  return result.rows.length > 0;
}

/**
 * Close the pool (for graceful shutdown)
 */
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  initializeDatabase,
  insertRating,
  getRatingById,
  getRatings,
  getRatingsCount,
  deleteRating,
  getAverageStars,
  getCategoryStats,
  getStarDistribution,
  getRecentRatingsCount,
  getIssueTrackingStats,
  testConnection,
  closePool
};
