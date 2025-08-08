const express = require('express');
const adminService = require('../services/adminService');
const notificationService = require('../services/notificationService');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { validatePagination, validateUUIDParam } = require('../middlewares/validation');
const { query } = require('express-validator');
const { supabase } = require('../config/supabase');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering and pagination
 * @access  Private (Admin only)
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  const { role, is_active, q, page = 1, pageSize = 20 } = req.query;
  const from = (Number(page) - 1) * Number(pageSize);
  const to = from + Number(pageSize) - 1;

  let query = supabase.from('users')
    .select('id, full_name, email, phone, role, address, business_name, is_verified, is_active, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (role) query = query.eq('role', role); // 'farmer' | 'retailer' | 'admin'
  if (typeof is_active !== 'undefined') query = query.eq('is_active', is_active === 'true');
  if (q) query = query.ilike('full_name', `%${q}%`);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ data, count, page: Number(page), pageSize: Number(pageSize) });
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin only)
 */
router.get('/users/:id', validateUUIDParam('id'), async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.id);

    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/admin/users/:id/verify
 * @desc    Verify a user
 * @access  Private (Admin only)
 */
router.patch('/users/:id/verify', validateUUIDParam('id'), async (req, res, next) => {
  try {
    const user = await adminService.verifyUser(req.params.id);

    // Send verification notification
    try {
      await notificationService.sendUserVerificationNotification(
        user.id,
        user.full_name
      );
    } catch (notificationError) {
      console.error('Failed to send verification notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'User verified successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/admin/users/:id/deactivate
 * @desc    Deactivate a user
 * @access  Private (Admin only)
 */
router.patch('/users/:id/deactivate', validateUUIDParam('id'), async (req, res, next) => {
  try {
    const user = await adminService.deactivateUser(req.params.id);

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/admin/users/:id/activate
 * @desc    Activate a user
 * @access  Private (Admin only)
 */
router.patch('/users/:id/activate', validateUUIDParam('id'), async (req, res, next) => {
  try {
    const user = await adminService.activateUser(req.params.id);

    res.json({
      success: true,
      message: 'User activated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user permanently (use with caution)
 * @access  Private (Admin only)
 */
router.delete('/users/:id', validateUUIDParam('id'), async (req, res, next) => {
  try {
    await adminService.deleteUser(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/products
 * @desc    Get all products with filtering and pagination
 * @access  Private (Admin only)
 */
router.get('/products', validatePagination, async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      farmer_id: req.query.farmer_id,
      search: req.query.search,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc'
    };

    const result = await adminService.getProducts(options);

    res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with filtering and pagination
 * @access  Private (Admin only)
 */
router.get('/orders', validatePagination, async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      retailer_id: req.query.retailer_id,
      farmer_id: req.query.farmer_id,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc'
    };

    const result = await adminService.getOrders(options);

    res.json({
      success: true,
      message: 'Orders retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/transactions
 * @desc    Get all transactions with full payment history and statistics
 * @access  Private (Admin only)
 */
router.get('/transactions', validatePagination, async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      payment_status: req.query.payment_status,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc'
    };

    const result = await adminService.getTransactionsWithStats(options);

    res.json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics by role
 * @access  Private (Admin only)
 */
router.get('/users/stats', async (req, res, next) => {
  try {
    const result = await adminService.getUsers({ limit: 1000 }); // Get all users for stats
    const users = result.users;

    const stats = {
      total: users.length,
      by_role: {
        farmer: users.filter(u => u.role === 'farmer').length,
        retailer: users.filter(u => u.role === 'retailer').length,
        admin: users.filter(u => u.role === 'admin').length
      },
      by_status: {
        verified: users.filter(u => u.is_verified).length,
        unverified: users.filter(u => !u.is_verified).length,
        active: users.filter(u => u.is_active).length,
        inactive: users.filter(u => !u.is_active).length
      },
      recent: {
        last_7_days: users.filter(u => {
          const userDate = new Date(u.created_at);
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return userDate >= sevenDaysAgo;
        }).length,
        last_30_days: users.filter(u => {
          const userDate = new Date(u.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return userDate >= thirtyDaysAgo;
        }).length
      }
    };

    res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/notifications/cleanup
 * @desc    Clean up old notifications
 * @access  Private (Admin only)
 */
router.post('/notifications/cleanup', async (req, res, next) => {
  try {
    const deletedCount = await notificationService.cleanupOldNotifications();

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old notifications`,
      data: { deleted_count: deletedCount }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/system/health
 * @desc    Get system health status
 * @access  Private (Admin only)
 */
router.get('/system/health', async (req, res, next) => {
  try {
    // Basic health checks
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      version: process.version
    };

    res.json({
      success: true,
      message: 'System health retrieved successfully',
      data: { health }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;