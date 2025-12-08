/**
 * Authentication Middleware
 * Protects admin routes and handles session validation
 */

const rateLimit = require('express-rate-limit');

/**
 * Middleware to require authentication for protected routes
 * Checks if a valid session exists with an authenticated user
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in to access this resource."
    });
  }

  // Session is valid, continue to the route handler
  next();
}

/**
 * Rate limiter for login attempts
 * Prevents brute force attacks on the login endpoint
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: {
    success: false,
    error: "Too many login attempts. Please try again in 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests from counting toward the limit
  skipSuccessfulRequests: true
});

/**
 * Middleware to attach user info to request if session exists
 * Does not require auth, just enriches request if logged in
 */
function attachUser(req, res, next) {
  // User info is already attached by session middleware
  // This is a passthrough for routes that optionally use auth info
  next();
}

module.exports = {
  requireAuth,
  loginRateLimiter,
  attachUser
};
