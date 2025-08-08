const express = require('express');
const authService = require('../services/authService');
const { authenticateToken, requireFarmerOrRetailer } = require('../middlewares/auth');
const { validatePagination, validateUUIDParam } = require('../middlewares/validation');

const router = express.Router();

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile (alias for /api/auth/profile)
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user.id);

    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user profile by ID (public info only)
 * @access  Private
 */
router.get('/:id', [
  authenticateToken,
  requireFarmerOrRetailer,
  ...validateUUIDParam('id')
], async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.params.id);
    
    // Return only public information
    const publicUser = {
      id: user.id,
      full_name: user.full_name,
      role: user.role,
      is_verified: user.is_verified,
      created_at: user.created_at
    };

    // Add contact info if user is verified
    if (user.is_verified) {
      publicUser.phone = user.phone;
      publicUser.address = user.address;
    }

    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: { user: publicUser }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;