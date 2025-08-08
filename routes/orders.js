const express = require('express');
const orderService = require('../services/orderservice');
const { authenticateToken } = require('../middlewares/auth');
const { validateOrderCreation, validateOrderStatusUpdate, validateOrderQuantityUpdate } = require('../middlewares/validation');

const router = express.Router();

/**
 * POST /api/orders
 * Create a new order (retailer only)
 */
router.post('/', authenticateToken, validateOrderCreation, async (req, res) => {
  try {
    // Only retailers can create orders
    if (req.user.role !== 'retailer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only retailers can create orders'
      });
    }

    const order = await orderService.createOrder(req.body, req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/orders
 * List orders with filters and pagination
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      retailer_id,
      farmer_id,
      status,
      limit = 10,
      offset = 0
    } = req.query;

    // Validate pagination parameters
    const parsedLimit = Math.min(parseInt(limit) || 10, 50); // Max 50 items per page
    const parsedOffset = parseInt(offset) || 0;

    const filters = {
      retailer_id,
      farmer_id,
      status
    };

    const pagination = {
      limit: parsedLimit,
      offset: parsedOffset
    };

    const result = await orderService.getOrders(filters, pagination, req.user.id, req.user.role);
    
    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/orders/:id
 * Get order details by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    
    // Check permissions
    const canView = 
      req.user.role === 'admin' ||
      order.retailer_id === req.user.id ||
      order.order_items.some(item => item.products.farmer_id === req.user.id);
    
    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this order'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Update order status
 */
router.patch('/:id/status', authenticateToken, validateOrderStatusUpdate, async (req, res) => {
  try {
    const { status } = req.body;
    
    const updatedOrder = await orderService.updateOrderStatus(
      req.params.id,
      status,
      req.user.id,
      req.user.role
    );
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PATCH /api/orders/:id
 * Update order quantity (pending orders only, retailer only)
 */
router.patch('/:id', authenticateToken, validateOrderQuantityUpdate, async (req, res) => {
  try {
    const { quantity } = req.body;
    
    const updatedOrder = await orderService.updateOrderQuantity(
      req.params.id,
      quantity,
      req.user.id,
      req.user.role
    );
    
    res.json({
      success: true,
      message: 'Order quantity updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order quantity:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;