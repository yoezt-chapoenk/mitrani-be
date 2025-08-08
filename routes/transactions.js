const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { validatePagination } = require('../middlewares/validation');
const transactionService = require('../services/transactionService');

const router = express.Router();

/**
 * GET /api/transactions
 * List transactions with filters and pagination
 */
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const {
      payment_status,
      payment_gateway,
      retailer_id,
      farmer_id,
      date_from,
      date_to,
      limit = 10,
      offset = 0
    } = req.query;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Prepare filters
    const filters = {};
    
    if (payment_status) {
      filters.payment_status = payment_status;
    }
    
    if (payment_gateway) {
      filters.payment_gateway = payment_gateway;
    }
    
    if (date_from) {
      filters.date_from = date_from;
    }
    
    if (date_to) {
      filters.date_to = date_to;
    }

    // Apply role-based filtering
    if (userRole === 'retailer') {
      filters.retailer_id = userId;
    } else if (userRole === 'farmer') {
      filters.farmer_id = userId;
    } else if (userRole === 'admin') {
      // Admins can filter by specific retailer or farmer
      if (retailer_id) {
        filters.retailer_id = retailer_id;
      }
      if (farmer_id) {
        filters.farmer_id = farmer_id;
      }
    }

    const pagination = {
      limit: Math.min(parseInt(limit), 50),
      offset: parseInt(offset)
    };

    const result = await transactionService.getTransactions(filters, pagination);

    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transactions'
    });
  }
});

/**
 * GET /api/transactions/stats
 * Get transaction statistics (admin only)
 */
router.get('/stats', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    
    const filters = {};
    if (date_from) {
      filters.date_from = date_from;
    }
    if (date_to) {
      filters.date_to = date_to;
    }

    const stats = await transactionService.getTransactionStats(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transaction statistics'
    });
  }
});

/**
 * GET /api/transactions/:id
 * Get transaction details by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const transaction = await transactionService.getTransactionById(id);
    
    // Check permissions
    if (userRole !== 'admin') {
      const isRetailerOwner = userRole === 'retailer' && transaction.orders.retailer_id === userId;
      const isFarmerInvolved = userRole === 'farmer' && 
        transaction.orders.order_items?.some(item => 
          item.products?.farmer_id === userId
        );
      
      if (!isRetailerOwner && !isFarmerInvolved) {
        return res.status(403).json({
          success: false,
          message: 'You can only view transactions related to your orders'
        });
      }
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Transaction not found'
    });
  }
});

/**
 * PATCH /api/transactions/:id/status
 * Update transaction status (admin only)
 */
router.patch('/:id/status', authenticateToken, authorizeRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, gateway_transaction_id } = req.body;

    // Validate payment status
    if (!['pending', 'paid', 'failed'].includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status. Must be: pending, paid, or failed'
      });
    }

    let updatedTransaction;
    
    if (payment_status === 'paid') {
      if (!gateway_transaction_id) {
        return res.status(400).json({
          success: false,
          message: 'Gateway transaction ID is required for paid status'
        });
      }
      
      const result = await transactionService.markTransactionAsPaid(id, gateway_transaction_id);
      updatedTransaction = result.transaction;
    } else if (payment_status === 'failed') {
      const result = await transactionService.markTransactionAsFailed(id, true);
      updatedTransaction = result.transaction;
    } else {
      // Update to pending
      updatedTransaction = await transactionService.updateTransaction(id, {
        payment_status: 'pending',
        paid_at: null
      });
    }

    res.json({
      success: true,
      message: 'Transaction status updated successfully',
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update transaction status'
    });
  }
});

/**
 * GET /api/transactions/order/:orderId
 * Get transaction by order ID
 */
router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const transaction = await transactionService.getTransactionByOrderId(orderId);
    
    // Get transaction with full details
    const fullTransaction = await transactionService.getTransactionById(transaction.id);
    
    // Check permissions
    if (userRole !== 'admin') {
      const isRetailerOwner = userRole === 'retailer' && fullTransaction.orders.retailer_id === userId;
      const isFarmerInvolved = userRole === 'farmer' && 
        fullTransaction.orders.order_items?.some(item => 
          item.products?.farmer_id === userId
        );
      
      if (!isRetailerOwner && !isFarmerInvolved) {
        return res.status(403).json({
          success: false,
          message: 'You can only view transactions related to your orders'
        });
      }
    }

    res.json({
      success: true,
      data: fullTransaction
    });
  } catch (error) {
    console.error('Error fetching transaction by order ID:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Transaction not found for this order'
    });
  }
});

module.exports = router;