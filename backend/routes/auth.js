/**
 * Authentication Routes
 * Handles admin login, logout, and session verification
 */

const express = require('express');
const router = express.Router();
const {
  findAdminByUsername,
  findAdminById,
  verifyPassword,
  updateLastLogin
} = require('../auth-database');
const { requireAuth, loginRateLimiter } = require('../middleware/auth');

/**
 * POST /api/admin/login
 * Authenticate admin user and create session
 */
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "Username and password are required for authentication."
      });
    }

    // Find user by username
    const user = findAdminByUsername(username);
    if (!user) {
      // Use same error message to prevent username enumeration
      return res.status(401).json({
        success: false,
        error: "Invalid credentials. Please check your username and password."
      });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials. Please check your username and password."
      });
    }

    // Update last login timestamp
    updateLastLogin(user.id);

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({
          success: false,
          error: "Authentication system error. Please try again."
        });
      }

      // Create session with user info
      req.session.userId = user.id;
      req.session.username = user.username;

      // Save session and respond
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Session save error:', saveErr);
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
    const user = findAdminById(req.session.userId);

    if (!user) {
      // Session exists but user doesn't - invalid state
      req.session.destroy();
      return res.status(401).json({
        success: false,
        error: "Session invalid. Please log in again."
      });
    }

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
