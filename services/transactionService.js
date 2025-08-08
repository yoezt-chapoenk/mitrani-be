const { supabase } = require('../config/supabase');

class TransactionService {
  constructor() {
    this.commissionRate = 0.05; // 5% platform commission
  }

  /**
   * Create a transaction record for an order
   * @param {string} orderId - Order ID
   * @param {number} amount - Transaction amount
   * @param {string} paymentGateway - Payment gateway (midtrans, xendit, stripe)
   * @returns {Object} Created transaction
   */
  async createTransaction(orderId, amount, paymentGateway = 'midtrans') {
    try {
      const commission = amount * this.commissionRate;
      
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          order_id: orderId,
          amount: amount,
          commission: commission,
          payment_gateway: paymentGateway,
          payment_status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create transaction: ${error.message}`);
      }

      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   * @param {string} transactionId - Transaction ID
   * @returns {Object} Transaction with order details
   */
  async getTransactionById(transactionId) {
    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select(`
          *,
          orders (
            id,
            retailer_id,
            total_amount,
            status,
            delivery_address,
            created_at,
            users (
              id,
              full_name,
              email,
              phone
            )
          )
        `)
        .eq('id', transactionId)
        .single();

      if (error) {
        throw new Error(`Transaction not found: ${error.message}`);
      }

      return transaction;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction by order ID
   * @param {string} orderId - Order ID
   * @returns {Object} Transaction
   */
  async getTransactionByOrderId(orderId) {
    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error) {
        throw new Error(`Transaction not found for order: ${error.message}`);
      }

      return transaction;
    } catch (error) {
      console.error('Error fetching transaction by order ID:', error);
      throw error;
    }
  }

  /**
   * Update transaction status and gateway details
   * @param {string} transactionId - Transaction ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated transaction
   */
  async updateTransaction(transactionId, updateData) {
    try {
      const { data: transaction, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update transaction: ${error.message}`);
      }

      return transaction;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  /**
   * Mark transaction as paid and update order status
   * @param {string} transactionId - Transaction ID
   * @param {string} gatewayTransactionId - Gateway transaction ID
   * @returns {Object} Updated transaction and order
   */
  async markTransactionAsPaid(transactionId, gatewayTransactionId) {
    try {
      // Update transaction status
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .update({
          payment_status: 'paid',
          gateway_transaction_id: gatewayTransactionId,
          paid_at: new Date().toISOString()
        })
        .eq('id', transactionId)
        .select('order_id')
        .single();

      if (transactionError) {
        throw new Error(`Failed to update transaction: ${transactionError.message}`);
      }

      // Update order status to confirmed
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', transaction.order_id)
        .select()
        .single();

      if (orderError) {
        throw new Error(`Failed to update order status: ${orderError.message}`);
      }

      return { transaction, order };
    } catch (error) {
      console.error('Error marking transaction as paid:', error);
      throw error;
    }
  }

  /**
   * Mark transaction as failed
   * @param {string} transactionId - Transaction ID
   * @param {boolean} cancelOrder - Whether to cancel the order
   * @returns {Object} Updated transaction
   */
  async markTransactionAsFailed(transactionId, cancelOrder = false) {
    try {
      // Update transaction status
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .update({
          payment_status: 'failed'
        })
        .eq('id', transactionId)
        .select('order_id')
        .single();

      if (transactionError) {
        throw new Error(`Failed to update transaction: ${transactionError.message}`);
      }

      let order = null;
      if (cancelOrder) {
        // Update order status to cancelled
        const { data: updatedOrder, error: orderError } = await supabase
          .from('orders')
          .update({
            status: 'cancelled'
          })
          .eq('id', transaction.order_id)
          .select()
          .single();

        if (orderError) {
          throw new Error(`Failed to cancel order: ${orderError.message}`);
        }

        order = updatedOrder;
      }

      return { transaction, order };
    } catch (error) {
      console.error('Error marking transaction as failed:', error);
      throw error;
    }
  }

  /**
   * Get transactions with filters and pagination
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Object} Transactions with pagination info
   */
  async getTransactions(filters = {}, pagination = { limit: 10, offset: 0 }) {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          orders (
            id,
            retailer_id,
            total_amount,
            status,
            delivery_address,
            created_at,
            users (
              id,
              full_name,
              email
            ),
            order_items (
              id,
              quantity,
              unit_price,
              total_price,
              products (
                id,
                name,
                farmer_id,
                users (
                  id,
                  full_name,
                  email
                )
              )
            )
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }

      if (filters.payment_gateway) {
        query = query.eq('payment_gateway', filters.payment_gateway);
      }

      if (filters.retailer_id) {
        query = query.eq('orders.retailer_id', filters.retailer_id);
      }

      if (filters.farmer_id) {
        query = query.eq('orders.order_items.products.farmer_id', filters.farmer_id);
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Apply pagination
      query = query
        .range(pagination.offset, pagination.offset + pagination.limit - 1)
        .order('created_at', { ascending: false });

      const { data: transactions, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch transactions: ${error.message}`);
      }

      return {
        transactions,
        pagination: {
          limit: pagination.limit,
          offset: pagination.offset,
          total: count
        }
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction statistics
   * @param {Object} filters - Filter options
   * @returns {Object} Transaction statistics
   */
  async getTransactionStats(filters = {}) {
    try {
      let query = supabase
        .from('transactions')
        .select('amount, commission, payment_status, created_at');

      // Apply date filters
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data: transactions, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch transaction stats: ${error.message}`);
      }

      const stats = {
        total_transactions: transactions.length,
        total_amount: 0,
        total_commission: 0,
        paid_transactions: 0,
        pending_transactions: 0,
        failed_transactions: 0,
        paid_amount: 0,
        pending_amount: 0
      };

      transactions.forEach(transaction => {
        stats.total_amount += parseFloat(transaction.amount);
        stats.total_commission += parseFloat(transaction.commission);

        switch (transaction.payment_status) {
          case 'paid':
            stats.paid_transactions++;
            stats.paid_amount += parseFloat(transaction.amount);
            break;
          case 'pending':
            stats.pending_transactions++;
            stats.pending_amount += parseFloat(transaction.amount);
            break;
          case 'failed':
            stats.failed_transactions++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error fetching transaction stats:', error);
      throw error;
    }
  }
}

module.exports = new TransactionService();