/**
 * 🤖 Baymax IT Care - Backend Server
 * "Hello. I am Baymax, your personal IT healthcare companion."
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const db = require('./database');
const CATEGORIES = require('./categories');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Validation constants
const MAX_COMMENT_LENGTH = 500;
const MAX_NAME_LENGTH = 100;

// ============== MIDDLEWARE ==============

// CORS - Restrict to specific origin(s)
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Parse JSON bodies
app.use(express.json());

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
    "I am satisfied with my care. Ba-la-la-la-la. 👊",
    "Maximum satisfaction detected! Your happiness is my primary directive.",
    "Five stars! I will add this to my database of successful patient outcomes.",
    "Excellent! I cannot deactivate until you say you are satisfied with your care. And you are!",
    "Your satisfaction levels are optimal. Fist bump? Ba-la-la-la-la. 👊"
  ]
};

// Get a random Baymax response based on stars
function getBaymaxResponse(stars) {
  const messages = BAYMAX_RESPONSES[stars] || BAYMAX_RESPONSES[3];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ============== API ROUTES ==============

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
app.post('/api/ratings', ratingsLimiter, (req, res) => {
  try {
    let { stars, category, comment, reviewer_name } = req.body;

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

    const stmt = db.prepare(`
      INSERT INTO ratings (stars, category, comment, reviewer_name)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      stars,
      category,
      comment || null,
      reviewer_name || 'Anonymous Patient'
    );

    const newRating = db.prepare('SELECT * FROM ratings WHERE id = ?').get(result.lastInsertRowid);
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
 * GET /api/ratings
 * Retrieve all ratings
 */
app.get('/api/ratings', (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const ratings = db.prepare(`
      SELECT * FROM ratings
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM ratings').get().count;

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
 * GET /api/stats
 * Get care statistics
 */
app.get('/api/stats', (req, res) => {
  try {
    const totalRatings = db.prepare('SELECT COUNT(*) as count FROM ratings').get().count;
    const avgStars = db.prepare('SELECT AVG(stars) as avg FROM ratings').get().avg || 0;

    // Count by category
    const categoryStats = db.prepare(`
      SELECT category, COUNT(*) as count, AVG(stars) as avg_stars
      FROM ratings
      GROUP BY category
      ORDER BY count DESC
    `).all();

    // Star distribution
    const starDistribution = db.prepare(`
      SELECT stars, COUNT(*) as count
      FROM ratings
      GROUP BY stars
      ORDER BY stars
    `).all();

    // Recent activity (last 7 days)
    const recentCount = db.prepare(`
      SELECT COUNT(*) as count FROM ratings
      WHERE created_at >= datetime('now', '-7 days')
    `).get().count;

    // Enrich category stats
    const enrichedCategoryStats = categoryStats.map(stat => {
      const categoryInfo = CATEGORIES[stat.category] || {};
      return {
        ...stat,
        category_name: categoryInfo.name || stat.category,
        category_emoji: categoryInfo.emoji || "💊",
        avg_stars: Math.round(stat.avg_stars * 10) / 10
      };
    });

    // Baymax care level titles based on average rating
    let careLevel = "Healthcare Companion in Training";
    if (avgStars >= 4.5) careLevel = "Superior Healthcare Companion 🏆";
    else if (avgStars >= 4) careLevel = "Advanced Care Provider 🌟";
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
          printers_rehabilitated: categoryStats.find(c => c.category === 'printer_rehabilitation')?.count || 0,
          emergencies_handled: categoryStats.find(c => c.category === 'emergency_response')?.count || 0,
          passwords_recovered: categoryStats.find(c => c.category === 'password_recovery')?.count || 0
        }
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

/**
 * GET /api/health
 * Health check endpoint - also verifies database connectivity
 */
app.get('/api/health', (req, res) => {
  try {
    // Verify database is accessible
    db.prepare('SELECT 1').get();

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

// Start the server
app.listen(PORT, () => {
  console.log(`
  🤖 ================================== 🤖

     Baymax IT Care - Backend
     Running on port ${PORT}
     CORS origin: ${FRONTEND_URL}

     "Hello. I am Baymax, your personal
      IT healthcare companion."

  🤖 ================================== 🤖
  `);
});
