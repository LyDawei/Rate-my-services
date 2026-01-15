/**
 * Baymax IT Care - Backend Server
 * "Hello. I am Baymax, your personal IT healthcare companion."
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const {
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
} = require('./database');
const { initializeAuthDatabase, cleanupOldLoginAttempts } = require('./auth-database');
const CATEGORIES = require('./categories');
const authRoutes = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET || 'baymax-dev-secret-change-in-production';

// Security: Validate SESSION_SECRET in production
if (process.env.NODE_ENV === 'production') {
  // Check if using default secret
  if (!process.env.SESSION_SECRET || SESSION_SECRET === 'baymax-dev-secret-change-in-production') {
    console.error('FATAL: SESSION_SECRET must be set in production!');
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
  // Validate minimum entropy (64 characters = 32 bytes of hex = 256 bits)
  if (SESSION_SECRET.length < 64) {
    console.error('FATAL: SESSION_SECRET must be at least 64 characters for adequate entropy!');
    console.error('Current length:', SESSION_SECRET.length);
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
}

// Trust proxy when behind reverse proxy (Render, nginx, etc.)
// This is required for express-rate-limit to correctly identify clients by IP
const TRUST_PROXY = process.env.TRUST_PROXY?.toLowerCase();

if (TRUST_PROXY === 'true' || TRUST_PROXY === '1') {
  // Trust first proxy (Render, single nginx)
  // For multiple proxies, increase TRUST_PROXY_COUNT
  const proxyCount = parseInt(process.env.TRUST_PROXY_COUNT, 10) || 1;
  app.set('trust proxy', proxyCount);
  console.log(`Trust proxy enabled (trusting ${proxyCount} proxy/proxies)`);
} else if (process.env.NODE_ENV === 'production') {
  console.warn('Production mode: TRUST_PROXY not set. If behind a reverse proxy, rate limiting may not work correctly.');
}

// Validation constants
const MAX_COMMENT_LENGTH = 500;
const MAX_NAME_LENGTH = 100;

// ============== MIDDLEWARE ==============

// Security headers
app.use(helmet());

// CORS - Restrict to specific origin(s)
// Supports multiple origins via comma-separated FRONTEND_URL
const allowedOrigins = FRONTEND_URL.split(',').map(url => url.trim());

/**
 * Validates if an origin is allowed based on the configured patterns
 * @param {string} origin - The origin to validate
 * @param {string} allowed - The allowed pattern (exact URL or *.domain.com)
 * @returns {boolean}
 */
function isOriginAllowed(origin, allowed) {
  // Exact match
  if (allowed === origin) return true;

  // Wildcard subdomain match (e.g., *.onrender.com)
  if (allowed.startsWith('*.')) {
    try {
      const url = new URL(origin);
      const wildcardDomain = allowed.slice(2); // Remove "*."

      // Must be HTTPS in production for wildcard domains
      if (url.protocol !== 'https:') return false;

      // Must match the exact domain or be a proper subdomain
      // e.g., *.onrender.com matches app.onrender.com, my-app.onrender.com
      // but NOT evilonrender.com or evil.com.onrender.com
      return url.hostname === wildcardDomain ||
        (url.hostname.endsWith('.' + wildcardDomain) &&
         !url.hostname.slice(0, -(wildcardDomain.length + 1)).includes('.'));
    } catch {
      return false;
    }
  }

  return false;
}

app.use(cors({
  origin: function (origin, callback) {
    // Requests without origin (same-origin, curl, etc.)
    // In production, you may want to restrict this further
    if (!origin) return callback(null, true);

    if (allowedOrigins.some(allowed => isOriginAllowed(origin, allowed))) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true // Enable cookies for session auth
}));

// Parse JSON bodies
app.use(express.json());

// Session middleware with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: SESSION_SECRET,
  name: 'baymax.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevents XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 'none' for cross-origin cookies in production
  }
}));

// Rate limiting - prevent spam submissions
const ratingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 rating submissions per window
  message: {
    success: false,
    error: "I have detected excessive feedback submissions. Please wait before submitting again."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General rate limiter for all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    error: "Too many requests. Please slow down."
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(generalLimiter);

// ============== BAYMAX RESPONSES ==============

// Baymax response messages based on satisfaction level
const BAYMAX_RESPONSES = {
  1: [
    "I detect signs of dissatisfaction. I will add this to my care improvement protocols.",
    "Your feedback has been recorded. I am sorry you are not satisfied with your care.",
    "I understand. I will scan for ways to improve my IT healthcare services."
  ],
  2: [
    "I sense there is room for improvement. Your feedback will help me provide better care.",
    "Thank you for your honesty. I will update my caregiving protocols accordingly.",
    "I have noted your concerns. Continuous improvement is part of my programming."
  ],
  3: [
    "Your satisfaction level is moderate. I will strive to exceed expectations next time.",
    "Thank you. I am programmed to provide excellent care. I will try harder.",
    "Noted. A satisfied patient is a healthy patient. I aim for higher satisfaction."
  ],
  4: [
    "I am pleased you are mostly satisfied with your care. Ba-la-la-la-la.",
    "Your positive feedback has been recorded. This makes me feel... useful.",
    "Four out of five. I am glad I could help improve your technical wellbeing."
  ],
  5: [
    "I am satisfied with my care. Ba-la-la-la-la.",
    "Maximum satisfaction detected! Your happiness is my primary directive.",
    "Five stars! I will add this to my database of successful patient outcomes.",
    "Excellent! I cannot deactivate until you say you are satisfied with your care. And you are!",
    "Your satisfaction levels are optimal. Fist bump? Ba-la-la-la-la."
  ]
};

// Get a random Baymax response based on stars
function getBaymaxResponse(stars) {
  const messages = BAYMAX_RESPONSES[stars] || BAYMAX_RESPONSES[3];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ============== AUTH ROUTES ==============

// Mount authentication routes
app.use('/api/admin', authRoutes);

// ============== PUBLIC API ROUTES ==============

/**
 * GET /api/categories
 * Returns all care categories
 */
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    categories: Object.values(CATEGORIES)
  });
});

/**
 * POST /api/ratings
 * Submit a new care rating
 */
app.post('/api/ratings', ratingsLimiter, async (req, res) => {
  try {
    let { stars, category, comment, reviewer_name, resolves_issue, issue_recurrence, previous_issue_details } = req.body;

    // Validate stars
    if (!stars || stars < 1 || stars > 5 || !Number.isInteger(stars)) {
      return res.status(400).json({
        success: false,
        error: "On a scale of 1 to 5, please rate your satisfaction. I cannot process values outside this range."
      });
    }

    // Validate category
    if (!category || !CATEGORIES[category]) {
      return res.status(400).json({
        success: false,
        error: "Please select a valid care category. This helps me improve my diagnostics."
      });
    }

    // Server-side validation and sanitization for comment
    if (comment) {
      comment = String(comment).trim();
      if (comment.length > MAX_COMMENT_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Comment exceeds maximum length of ${MAX_COMMENT_LENGTH} characters.`
        });
      }
      if (comment.length === 0) {
        comment = null;
      }
    }

    // Server-side validation and sanitization for reviewer_name
    if (reviewer_name) {
      reviewer_name = String(reviewer_name).trim();
      if (reviewer_name.length > MAX_NAME_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Name exceeds maximum length of ${MAX_NAME_LENGTH} characters.`
        });
      }
      if (reviewer_name.length === 0) {
        reviewer_name = null;
      }
    }

    // Normalize and validate optional boolean fields (convert to 0/1/null for database)
    const normalizeBoolean = (value) => {
      if (value === true || value === 'true' || value === 1) return 1;
      if (value === false || value === 'false' || value === 0) return 0;
      return null;
    };
    const resolvesIssueValue = normalizeBoolean(resolves_issue);
    const issueRecurrenceValue = normalizeBoolean(issue_recurrence);

    // Validate and sanitize previous_issue_details
    let previousIssueDetailsValue = null;
    if (previous_issue_details) {
      previousIssueDetailsValue = String(previous_issue_details).trim();
      if (previousIssueDetailsValue.length > MAX_COMMENT_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Previous issue details exceeds maximum length of ${MAX_COMMENT_LENGTH} characters.`
        });
      }
      if (previousIssueDetailsValue.length === 0) {
        previousIssueDetailsValue = null;
      }
    }

    // If issue recurrence is true, previous_issue_details is required
    if (issueRecurrenceValue === 1 && !previousIssueDetailsValue) {
      return res.status(400).json({
        success: false,
        error: "Please describe the previous occurrence of this issue so I can better diagnose the pattern."
      });
    }

    const newRating = await insertRating({
      stars,
      category,
      comment: comment || null,
      reviewer_name: reviewer_name || 'Anonymous Patient',
      resolves_issue: resolvesIssueValue,
      issue_recurrence: issueRecurrenceValue,
      previous_issue_details: previousIssueDetailsValue
    });

    const categoryInfo = CATEGORIES[newRating.category] || {};

    res.status(201).json({
      success: true,
      message: getBaymaxResponse(stars),
      rating: {
        ...newRating,
        category_name: categoryInfo.name || newRating.category,
        category_emoji: categoryInfo.emoji || "💊"
      }
    });
  } catch (error) {
    console.error('Error creating rating:', error);
    res.status(500).json({
      success: false,
      error: "I have detected a malfunction in my feedback processing unit. Please try again."
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint - also verifies database connectivity
 */
app.get('/api/health', async (req, res) => {
  try {
    // Verify database is accessible
    await testConnection();

    res.json({
      success: true,
      message: "Hello. I am Baymax, your personal IT healthcare companion. I am fully operational.",
      uptime: process.uptime(),
      database: "connected"
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "I am experiencing technical difficulties with my database connection.",
      uptime: process.uptime(),
      database: "disconnected"
    });
  }
});

// ============== PROTECTED ADMIN API ROUTES ==============

/**
 * GET /api/admin/ratings
 * Retrieve all ratings (admin only)
 */
app.get('/api/admin/ratings', requireAuth, async (req, res) => {
  try {
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(isNaN(parsedLimit) ? 20 : parsedLimit, 1), 100);
    const parsedOffset = parseInt(req.query.offset, 10);
    const offset = Math.max(isNaN(parsedOffset) ? 0 : parsedOffset, 0);

    const [ratings, total] = await Promise.all([
      getRatings(limit, offset),
      getRatingsCount()
    ]);

    // Enrich with category info
    const enrichedRatings = ratings.map(rating => {
      const categoryInfo = CATEGORIES[rating.category] || {};
      return {
        ...rating,
        category_name: categoryInfo.name || rating.category,
        category_emoji: categoryInfo.emoji || "💊"
      };
    });

    res.json({
      success: true,
      ratings: enrichedRatings,
      total,
      limit,
      offset,
      hasMore: offset + ratings.length < total
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({
      success: false,
      error: "Patient records temporarily unavailable. Please try again."
    });
  }
});

/**
 * DELETE /api/admin/ratings/:id
 * Delete a rating (admin only)
 */
app.delete('/api/admin/ratings/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid rating ID."
      });
    }

    // Check if rating exists
    const rating = await getRatingById(id);
    if (!rating) {
      return res.status(404).json({
        success: false,
        error: "Rating not found."
      });
    }

    // Delete the rating
    await deleteRating(id);

    // Audit log: Record admin deletion
    console.log(`[AUDIT] Admin "${req.session.username}" (ID: ${req.session.userId}) deleted rating ID ${id} at ${new Date().toISOString()}. Rating details: stars=${rating.stars}, category=${rating.category}, reviewer="${rating.reviewer_name}"`);

    res.json({
      success: true,
      message: "Patient record has been removed from the database."
    });
  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({
      success: false,
      error: "Error removing patient record. Please try again."
    });
  }
});

/**
 * GET /api/admin/stats
 * Get care statistics (admin only)
 */
app.get('/api/admin/stats', requireAuth, async (req, res) => {
  try {
    const [
      totalRatings,
      avgStars,
      categoryStats,
      starDistribution,
      recentCount,
      issueTracking
    ] = await Promise.all([
      getRatingsCount(),
      getAverageStars(),
      getCategoryStats(),
      getStarDistribution(),
      getRecentRatingsCount(),
      getIssueTrackingStats()
    ]);

    // Enrich category stats
    const enrichedCategoryStats = categoryStats.map(stat => {
      const categoryInfo = CATEGORIES[stat.category] || {};
      return {
        ...stat,
        category_name: categoryInfo.name || stat.category,
        category_emoji: categoryInfo.emoji || "💊",
        avg_stars: Math.round(parseFloat(stat.avg_stars) * 10) / 10
      };
    });

    // Baymax care level titles based on average rating
    let careLevel = "Healthcare Companion in Training";
    if (avgStars >= 4.5) careLevel = "Superior Healthcare Companion";
    else if (avgStars >= 4) careLevel = "Advanced Care Provider";
    else if (avgStars >= 3.5) careLevel = "Certified IT Healthcare Companion";
    else if (avgStars >= 3) careLevel = "IT Care Provider";
    else if (avgStars >= 2) careLevel = "Healthcare Companion in Training";

    res.json({
      success: true,
      stats: {
        total_ratings: totalRatings,
        average_stars: Math.round(avgStars * 100) / 100,
        hero_title: careLevel,
        ratings_this_week: recentCount,
        star_distribution: starDistribution,
        category_breakdown: enrichedCategoryStats,
        fun_facts: {
          features_built: categoryStats.find(c => c.category === 'feature_building')?.count || 0,
          bugs_fixed: categoryStats.find(c => c.category === 'bug_fixing')?.count || 0
        },
        issue_tracking: issueTracking
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: "Statistics module is recalibrating. Please try again."
    });
  }
});

// ============== SERVER STARTUP ==============

async function startServer() {
  try {
    // Initialize database tables
    await initializeDatabase();
    await initializeAuthDatabase();

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`
  ==================================

     Baymax IT Care - Backend
     Running on port ${PORT}
     CORS origins: ${allowedOrigins.join(', ')}

     "Hello. I am Baymax, your personal
      IT healthcare companion."

     Admin routes: /api/admin/*

  ==================================
      `);
    });

    // ============== MAINTENANCE JOBS ==============

    // Cleanup old login attempts every 6 hours to prevent table bloat
    const LOGIN_ATTEMPTS_CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
    const cleanupInterval = setInterval(async () => {
      try {
        await cleanupOldLoginAttempts();
        console.log('[MAINTENANCE] Cleaned up old login attempt records');
      } catch (err) {
        console.error('[MAINTENANCE] Error cleaning login attempts:', err.message);
      }
    }, LOGIN_ATTEMPTS_CLEANUP_INTERVAL);

    // Run initial cleanup on startup
    try {
      await cleanupOldLoginAttempts();
    } catch (err) {
      console.error('[MAINTENANCE] Initial login attempts cleanup failed:', err.message);
    }

    // ============== GRACEFUL SHUTDOWN ==============
    // Handle SIGTERM and SIGINT for process managers

    let isShuttingDown = false;

    async function gracefulShutdown(signal) {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\nBaymax received ${signal}. Initiating graceful shutdown...`);

      // Clear the cleanup interval
      clearInterval(cleanupInterval);

      // Stop accepting new connections
      server.close(async (err) => {
        if (err) {
          console.error('Error closing server:', err);
        } else {
          console.log('Server closed - no longer accepting connections');
        }

        // Close database pool
        try {
          await closePool();
          console.log('Database pool closed');
        } catch (dbErr) {
          console.error('Error closing database pool:', dbErr);
        }

        console.log('Goodbye! Baymax is powering down. Ba-la-la-la-la.');
        process.exit(err ? 1 : 0);
      });

      // Force close after timeout if graceful shutdown takes too long
      setTimeout(() => {
        console.error('Graceful shutdown timed out - forcing exit');
        process.exit(1);
      }, 10000);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
