const express = require('express');
const { authenticateToken } = require('../middlewares/auth');
const transactionService = require('../services/transactionService');
const paymentService = require('../services/paymentService');
const orderService = require('../services/orderservice');

const router = express.Router();

/**
 * POST /api/orders/:id/pay
 * Generate payment request for an order
 */
router.post('/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { payment_gateway = 'midtrans' } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate payment gateway
    if (!['midtrans', 'xendit', 'stripe'].includes(payment_gateway)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment gateway. Supported: midtrans, xendit, stripe'
      });
    }

    // Get order details
    const order = await orderService.getOrderById(orderId);
    
    // Check if user owns the order (retailers only)
    if (userRole !== 'admin' && order.retailer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only pay for your own orders'
      });
    }

    // Check if order is in pending status
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be paid'
      });
    }

    // Get or create transaction
    let transaction;
    try {
      transaction = await transactionService.getTransactionByOrderId(orderId);
      
      // Check if already paid
      if (transaction.payment_status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Order has already been paid'
        });
      }
    } catch (error) {
      // Create transaction if not exists
      transaction = await transactionService.createTransaction(
        orderId,
        order.total_amount,
        payment_gateway
      );
    }

    // Prepare transaction data for payment gateway
    const transactionData = {
      id: transaction.id,
      order_id: orderId,
      amount: transaction.amount,
      customer_name: order.users.full_name,
      customer_email: order.users.email,
      customer_phone: order.users.phone
    };

    // Create payment request
    const paymentResponse = await paymentService.createPayment(payment_gateway, transactionData);

    // Update transaction with payment gateway details
    await transactionService.updateTransaction(transaction.id, {
      payment_gateway: payment_gateway,
      gateway_payment_url: paymentResponse.payment_url,
      gateway_token: paymentResponse.token,
      gateway_transaction_id: paymentResponse.gateway_transaction_id
    });

    res.json({
      success: true,
      message: 'Payment request created successfully',
      data: {
        transaction_id: transaction.id,
        payment_url: paymentResponse.payment_url,
        token: paymentResponse.token,
        gateway: payment_gateway,
        amount: transaction.amount,
        order_id: orderId
      }
    });
  } catch (error) {
    console.error('Error creating payment request:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment request'
    });
  }
});

/**
 * POST /api/payments/webhook
 * Handle payment gateway webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-signature'] || 
                     req.headers['x-callback-token'] || 
                     req.headers['stripe-signature'];
    
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing signature header'
      });
    }

    // Determine gateway from headers or payload
    let gateway = 'midtrans'; // default
    if (req.headers['x-callback-token']) {
      gateway = 'xendit';
    } else if (req.headers['stripe-signature']) {
      gateway = 'stripe';
    }

    const rawPayload = req.body;
    let payload;
    
    try {
      payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON payload'
      });
    }

    // Verify webhook signature
    const isValidSignature = paymentService.verifyWebhookSignature(
      gateway,
      gateway === 'stripe' ? rawPayload : payload,
      signature
    );

    if (!isValidSignature) {
      console.error('Invalid webhook signature:', { gateway, signature });
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Parse webhook payload
    const webhookData = paymentService.parseWebhookPayload(gateway, payload);
    
    if (!webhookData.transaction_id) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID not found in webhook payload'
      });
    }

    // Get transaction
    const transaction = await transactionService.getTransactionById(webhookData.transaction_id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Handle payment success
    if (webhookData.is_success) {
      await transactionService.markTransactionAsPaid(
        transaction.id,
        webhookData.gateway_transaction_id
      );
      
      console.log(`Payment successful for transaction ${transaction.id}`);
    }
    // Handle payment failure
    else if (webhookData.is_failed) {
      await transactionService.markTransactionAsFailed(
        transaction.id,
        true // Cancel order on payment failure
      );
      
      console.log(`Payment failed for transaction ${transaction.id}`);
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook'
    });
  }
});

/**
 * GET /api/payments/status/:transactionId
 * Get payment status for a transaction
 */
router.get('/status/:transactionId', authenticateToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get transaction with order details
    const transaction = await transactionService.getTransactionById(transactionId);
    
    // Check permissions
    if (userRole !== 'admin' && transaction.orders.retailer_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own payment status'
      });
    }

    res.json({
      success: true,
      data: {
        transaction_id: transaction.id,
        order_id: transaction.order_id,
        amount: transaction.amount,
        payment_status: transaction.payment_status,
        payment_gateway: transaction.payment_gateway,
        paid_at: transaction.paid_at,
        created_at: transaction.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payment status'
    });
  }
});

module.exports = router;