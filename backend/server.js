/**
 * 🧙‍♂️ Rate My IT Services - The Sacred Server
 * Where gratitude flows and roasts are welcomed
 */

const express = require('express');
const cors = require('cors');
const db = require('./database');
const CATEGORIES = require('./categories');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Fun response messages for different star ratings
const THANK_YOU_MESSAGES = {
  1: [
    "Ouch! But hey, feedback is feedback. We'll try harder! 😅",
    "Well, at least you're honest. Noted! 📝",
    "One star? The IT gods weep, but we shall improve!"
  ],
  2: [
    "Room for improvement noted! We're on it! 💪",
    "Two stars... we've had worse days! Thanks for the honesty!",
    "Mediocre is just 'great' in disguise. We'll get there!"
  ],
  3: [
    "Right down the middle! Perfectly balanced, as all things should be.",
    "Three stars - the IT equivalent of 'it works, don't touch it'",
    "Average today, legendary tomorrow! Thanks! ⭐⭐⭐"
  ],
  4: [
    "Four stars! So close to perfection! 🌟",
    "Almost perfect - like a computer that only freezes occasionally!",
    "Four stars! We're blushing over here! 😊"
  ],
  5: [
    "FIVE STARS! You're too kind! 🏆✨",
    "Legendary status achieved! The IT gods smile upon us!",
    "Perfect score! This is going on the fridge! ⭐⭐⭐⭐⭐",
    "Five stars?! Quick, someone screenshot this!",
    "We shall frame this rating in the Hall of IT Fame!"
  ]
};

// Get a random thank you message based on stars
function getThankYouMessage(stars) {
  const messages = THANK_YOU_MESSAGES[stars] || THANK_YOU_MESSAGES[3];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ============== API ROUTES ==============

/**
 * GET /api/categories
 * Returns all the legendary categories of IT wizardry
 */
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    categories: Object.values(CATEGORIES)
  });
});

/**
 * POST /api/ratings
 * Submit a new rating to the sacred vault
 */
app.post('/api/ratings', (req, res) => {
  try {
    const { stars, category, comment, reviewer_name } = req.body;

    // Validate stars
    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({
        success: false,
        error: "Stars must be between 1 and 5. We don't do 6-star ratings here... yet."
      });
    }

    // Validate category
    if (!category || !CATEGORIES[category]) {
      return res.status(400).json({
        success: false,
        error: "Invalid category. Pick one from the sacred list!"
      });
    }

    const stmt = db.prepare(`
      INSERT INTO ratings (stars, category, comment, reviewer_name)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      stars,
      category,
      comment || null,
      reviewer_name || 'Anonymous Hero'
    );

    const newRating = db.prepare('SELECT * FROM ratings WHERE id = ?').get(result.lastInsertRowid);
    const categoryInfo = CATEGORIES[newRating.category];

    res.status(201).json({
      success: true,
      message: getThankYouMessage(stars),
      rating: {
        ...newRating,
        category_name: categoryInfo.name,
        category_emoji: categoryInfo.emoji
      }
    });
  } catch (error) {
    console.error('Error creating rating:', error);
    res.status(500).json({
      success: false,
      error: "Something went wrong in the IT dimension. Try again!"
    });
  }
});

/**
 * GET /api/ratings
 * Retrieve all ratings from the vault (with pagination)
 */
app.get('/api/ratings', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

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
        category_emoji: categoryInfo.emoji || "✨"
      };
    });

    res.json({
      success: true,
      ratings: enrichedRatings,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({
      success: false,
      error: "The vault is temporarily sealed. Try again!"
    });
  }
});

/**
 * GET /api/stats
 * Get fun statistics about IT heroism
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
        category_emoji: categoryInfo.emoji || "✨",
        avg_stars: Math.round(stat.avg_stars * 10) / 10
      };
    });

    // Fun titles based on average rating
    let heroTitle = "IT Intern";
    if (avgStars >= 4.5) heroTitle = "Legendary IT Wizard 🧙‍♂️";
    else if (avgStars >= 4) heroTitle = "Senior IT Sorcerer ✨";
    else if (avgStars >= 3.5) heroTitle = "IT Knight ⚔️";
    else if (avgStars >= 3) heroTitle = "IT Squire 🛡️";
    else if (avgStars >= 2) heroTitle = "IT Apprentice 📚";

    res.json({
      success: true,
      stats: {
        total_ratings: totalRatings,
        average_stars: Math.round(avgStars * 100) / 100,
        hero_title: heroTitle,
        ratings_this_week: recentCount,
        star_distribution: starDistribution,
        category_breakdown: enrichedCategoryStats,
        fun_facts: {
          printers_tamed: categoryStats.find(c => c.category === 'printer_taming')?.count || 0,
          crises_averted: categoryStats.find(c => c.category === 'crisis_averted')?.count || 0,
          passwords_resurrected: categoryStats.find(c => c.category === 'password_resurrection')?.count || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: "Stats machine is recalibrating. Try again!"
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: "The IT Rating Server is alive and well! 🎉",
    uptime: process.uptime()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
  🧙‍♂️ ================================== 🧙‍♂️

     Rate My IT Services - Backend
     Running on port ${PORT}

     Ready to receive gratitude!
     (and the occasional roast)

  🧙‍♂️ ================================== 🧙‍♂️
  `);
});
