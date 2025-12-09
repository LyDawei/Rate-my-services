/**
 * Authentication Middleware
 * Protects admin routes and handles session validation
 */

const rateLimit = require('express-rate-limit');

// Session timeout constants
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours absolute maximum

/**
 * Middleware to require authentication for protected routes
 * Checks if a valid session exists with an authenticated user
 * Also validates session hasn't expired due to idle time or absolute age
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in to access this resource."
    });
  }

  const now = Date.now();

  // Handle sessions missing metadata (created before this update)
  // Force re-login for old session format to ensure security
  if (!req.session.createdAt || !req.session.lastActivity) {
    req.session.destroy(() => {});
    res.clearCookie('baymax.sid');
    return res.status(401).json({
      success: false,
      error: "Session format outdated. Please log in again."
    });
  }

  // Check absolute session age (session created too long ago)
  if ((now - req.session.createdAt) > SESSION_MAX_AGE_MS) {
    req.session.destroy(() => {});
    res.clearCookie('baymax.sid');
    return res.status(401).json({
      success: false,
      error: "Session expired. Please log in again."
    });
  }

  // Check idle timeout (no activity for too long)
  if ((now - req.session.lastActivity) > SESSION_IDLE_TIMEOUT_MS) {
    req.session.destroy(() => {});
    res.clearCookie('baymax.sid');
    return res.status(401).json({
      success: false,
      error: "Session timed out due to inactivity. Please log in again."
    });
  }

  // Update last activity timestamp
  req.session.lastActivity = now;

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
