/**
 * Authentication Routes
 * Handles admin login, logout, and session verification
 */

const express = require('express');
const router = express.Router();
const {
  findAdminById,
  verifyCredentialsConstantTime,
  updateLastLogin,
  recordLoginAttempt,
  isAccountLocked,
  clearFailedAttempts,
  MAX_FAILED_ATTEMPTS
} = require('../auth-database');
const { requireAuth, loginRateLimiter } = require('../middleware/auth');

/**
 * POST /api/admin/login
 * Authenticate admin user and create session
 */
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = req.ip;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required for authentication."
      });
    }

    // Check account lockout status BEFORE checking credentials
    // This prevents timing attacks from revealing valid usernames
    const lockoutStatus = isAccountLocked(username);
    if (lockoutStatus.locked) {
      const minutesRemaining = lockoutStatus.lockoutEndsAt
        ? Math.ceil((lockoutStatus.lockoutEndsAt.getTime() - Date.now()) / 60000)
        : 15;
      return res.status(429).json({
        success: false,
        error: `Account temporarily locked due to too many failed attempts. Try again in ${minutesRemaining} minutes.`
      });
    }

    // Verify credentials using constant-time comparison
    // This ALWAYS performs bcrypt comparison to prevent timing attacks
    // that could enumerate valid usernames
    const { valid, user } = await verifyCredentialsConstantTime(username, password);

    if (!valid) {
      // Record failed attempt (works for both non-existent users and wrong passwords)
      recordLoginAttempt(username, clientIp, false);

      // Check new lockout status after this failed attempt
      const newLockoutStatus = isAccountLocked(username);
      if (newLockoutStatus.locked) {
        return res.status(429).json({
          success: false,
          error: `Account locked due to too many failed attempts. Try again in 15 minutes.`
        });
      }

      return res.status(401).json({
        success: false,
        error: `Invalid credentials. ${newLockoutStatus.remainingAttempts} attempt(s) remaining before lockout.`
      });
    }

    // Successful login - clear failed attempts and record success
    clearFailedAttempts(username);
    recordLoginAttempt(username, clientIp, true);

    // Update last login timestamp
    updateLastLogin(user.id);

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        // CRITICAL: Destroy old session on regeneration failure to prevent session fixation
        req.session.destroy(() => {});
        res.clearCookie('baymax.sid');
        return res.status(500).json({
          success: false,
          error: "Authentication system error. Please try again."
        });
      }

      // Create session with user info and metadata for expiry tracking
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.createdAt = Date.now();
      req.session.lastActivity = Date.now();

      // Save session and respond
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
          // Destroy session on save error
          req.session.destroy(() => {});
          res.clearCookie('baymax.sid');
          return res.status(500).json({
            success: false,
            error: "Authentication system error. Please try again."
          });
        }

        // Return user info (without sensitive data)
        res.json({
          success: true,
          message: "Authentication successful. Welcome back, administrator.",
          user: {
            id: user.id,
            username: user.username,
            display_name: user.display_name
          }
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: "Authentication system error. Please try again."
    });
  }
});

/**
 * POST /api/admin/logout
 * Destroy session and log out
 */
router.post('/logout', (req, res) => {
  if (!req.session) {
    return res.json({
      success: true,
      message: "Already logged out."
    });
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({
        success: false,
        error: "Error during logout. Please try again."
      });
    }

    // Clear the session cookie
    res.clearCookie('baymax.sid');

    res.json({
      success: true,
      message: "Logged out successfully. Goodbye, administrator."
    });
  });
});

/**
 * GET /api/admin/me
 * Get current authenticated user info
 * Used by frontend to check auth state on page load
 */
router.get('/me', requireAuth, (req, res) => {
  try {
    // Validate userId is a valid integer
    const userId = parseInt(req.session.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      req.session.destroy(() => {});
      res.clearCookie('baymax.sid');
      return res.status(401).json({
        success: false,
        error: "Session invalid. Please log in again."
      });
    }

    const user = findAdminById(userId);

    if (!user) {
      // Session exists but user doesn't - invalid state
      req.session.destroy(() => {});
      res.clearCookie('baymax.sid');
      return res.status(401).json({
        success: false,
        error: "Session invalid. Please log in again."
      });
    }

    // Update last activity timestamp for session expiry tracking
    req.session.lastActivity = Date.now();

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        last_login: user.last_login
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: "Error retrieving user information."
    });
  }
});

module.exports = router;
