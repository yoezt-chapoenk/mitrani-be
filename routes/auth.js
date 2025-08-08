const express = require('express');
const authService = require('../services/authService');
const notificationService = require('../services/notificationService');
const { authenticateToken } = require('../middlewares/auth');
const { 
  validateUserRegistration, 
  validateUserLogin,
  handleValidationErrors
} = require('../middlewares/validation');
const { body } = require('express-validator');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateUserRegistration, async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    
    // Send welcome notification
    try {
      await notificationService.sendWelcomeNotification(
        result.user.id,
        result.user.full_name,
        result.user.role
      );
    } catch (notificationError) {
      console.error('Failed to send welcome notification:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateUserLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user.id);

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', [
  authenticateToken,
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone('id-ID')
    .withMessage('Please provide a valid Indonesian phone number'),
  body('address')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  handleValidationErrors
], async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', [
  authenticateToken,
  body('current_password')
    .notEmpty()
    .withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  body('confirm_password')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
  handleValidationErrors
], async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    
    await authService.changePassword(req.user.id, current_password, new_password);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify JWT token
 * @access  Private
 */
router.post('/verify-token', authenticateToken, async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          full_name: req.user.full_name,
          role: req.user.role,
          is_verified: req.user.is_verified,
          is_active: req.user.is_active
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh-token', authenticateToken, async (req, res, next) => {
  try {
    const newToken = authService.generateToken(req.user.id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        user: {
          id: req.user.id,
          email: req.user.email,
          full_name: req.user.full_name,
          role: req.user.role,
          is_verified: req.user.is_verified,
          is_active: req.user.is_active
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;