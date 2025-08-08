const express = require('express');
const notificationService = require('../services/notificationService');
const { authenticateToken } = require('../middlewares/auth');
const { validatePagination, validateUUIDParam } = require('../middlewares/validation');
const { query } = require('express-validator');

const router = express.Router();

// All notification routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for current user
 * @access  Private
 */
router.get('/', validatePagination, async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      is_read: req.query.is_read === 'true' ? true : req.query.is_read === 'false' ? false : undefined,
      type: req.query.type,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc'
    };

    const result = await notificationService.getUserNotifications(req.user.id, options);

    res.json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count for current user
 * @access  Private
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);

    res.json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: { unread_count: count }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', validateUUIDParam('id'), async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/notifications/mark-all-read
 * @desc    Mark all notifications as read for current user
 * @access  Private
 */
router.patch('/mark-all-read', async (req, res, next) => {
  try {
    const count = await notificationService.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      data: { marked_count: count }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', validateUUIDParam('id'), async (req, res, next) => {
  try {
    await notificationService.deleteNotification(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/notifications/unread
 * @desc    Get only unread notifications for current user
 * @access  Private
 */
router.get('/unread', validatePagination, async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      is_read: false,
      type: req.query.type,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc'
    };

    const result = await notificationService.getUserNotifications(req.user.id, options);

    res.json({
      success: true,
      message: 'Unread notifications retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/notifications/by-type/:type
 * @desc    Get notifications by type for current user
 * @access  Private
 */
router.get('/by-type/:type', [
  query('type')
    .isIn(['order', 'account', 'stock', 'welcome', 'info'])
    .withMessage('Invalid notification type'),
  validatePagination
], async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      type: req.params.type,
      is_read: req.query.is_read === 'true' ? true : req.query.is_read === 'false' ? false : undefined,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc'
    };

    const result = await notificationService.getUserNotifications(req.user.id, options);

    res.json({
      success: true,
      message: `${req.params.type} notifications retrieved successfully`,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;