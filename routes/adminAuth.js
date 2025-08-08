const express = require('express');
const adminAuthService = require('../services/adminAuthService');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting middleware specifically for admin login
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many admin login attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
  // Custom key generator to include user agent for better tracking
  keyGenerator: (req) => {
    return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
  }
});

// Validation middleware for admin login
const validateAdminLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),
  // Custom middleware to handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * @route   POST /api/admin/login
 * @desc    Admin-specific login endpoint
 * @access  Public (but restricted to admin users)
 */
router.post('/login', adminLoginLimiter, validateAdminLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Log admin login attempt
    console.log(`🔐 Admin login attempt: ${email} from IP: ${clientIP}`);
    
    // Attempt admin login
    const result = await adminAuthService.adminLogin(email, password, clientIP);
    
    // Set secure HTTP-only cookie for additional security (optional)
    res.cookie('admin_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: result.user,
        token: result.token,
        loginTime: result.loginTime,
        expiresIn: '24h'
      }
    });
  } catch (error) {
    // Handle specific error types
    if (error.message.includes('Too many failed login attempts')) {
      return res.status(429).json({
        success: false,
        message: error.message,
        type: 'RATE_LIMITED'
      });
    }
    
    if (error.message.includes('Invalid admin credentials') || 
        error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Invalid admin credentials or insufficient privileges',
        type: 'FORBIDDEN'
      });
    }
    
    // Log unexpected errors
    console.error('Admin login error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error during admin login',
      type: 'SERVER_ERROR'
    });
  }
});

/**
 * @route   GET /api/admin/login/status
 * @desc    Get rate limit status for current IP
 * @access  Public
 */
router.get('/login/status', (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const status = adminAuthService.getRateLimitStatus(clientIP);
    
    res.json({
      success: true,
      message: 'Rate limit status retrieved',
      data: status
    });
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rate limit status'
    });
  }
});

/**
 * @route   POST /api/admin/logout
 * @desc    Admin logout (clear session)
 * @access  Public
 */
router.post('/logout', (req, res) => {
  try {
    // Clear the admin session cookie
    res.clearCookie('admin_session');
    
    res.json({
      success: true,
      message: 'Admin logout successful'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
});

module.exports = router;