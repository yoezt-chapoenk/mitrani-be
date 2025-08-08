const { supabase } = require('../config/supabase');

class FarmerService {
  /**
   * Get comprehensive farmer dashboard data
   * @param {string} farmerId - Farmer user ID
   * @returns {Object} - Complete farmer dashboard data
   */
  async getFarmerDashboard(farmerId) {
    try {
      // Get farmer information
      const { data: farmer, error: farmerError } = await supabase
        .from('users')
        .select('id, full_name, email, phone, address, avatar_url, business_name, is_verified, is_active, created_at')
        .eq('id', farmerId)
        .eq('role', 'farmer')
        .single();

      if (farmerError) {
        throw new Error(`Failed to fetch farmer data: ${farmerError.message}`);
      }

      if (!farmer) {
        throw new Error('Farmer not found');
      }

      // Get farmer's products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, quantity, unit, price, harvest_date, image_url, status, created_at, updated_at')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (productsError) {
        throw new Error(`Failed to fetch products: ${productsError.message}`);
      }

      // Get orders related to farmer's products
      const { data: orders, error: ordersError } = await supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          total_price,
          created_at,
          order_id,
          product_id,
          orders!inner (
            id,
            retailer_id,
            total_amount,
            status,
            delivery_address,
            notes,
            ordered_at,
            confirmed_at,
            delivered_at,
            completed_at,
            created_at,
            updated_at,
            users!orders_retailer_id_fkey (
              id,
              full_name,
              email,
              phone,
              business_name
            )
          ),
          products!inner (
            id,
            name,
            unit,
            price,
            farmer_id
          )
        `)
        .eq('products.farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw new Error(`Failed to fetch orders: ${ordersError.message}`);
      }

      // Get transactions related to farmer's orders
      const orderIds = orders?.map(item => item.orders.id) || [];
      let transactions = [];
      
      if (orderIds.length > 0) {
        const { data: transactionData, error: transactionsError } = await supabase
          .from('transactions')
          .select('id, order_id, amount, payment_status, commission, payment_gateway, paid_at, created_at, updated_at')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false });

        if (transactionsError) {
          throw new Error(`Failed to fetch transactions: ${transactionsError.message}`);
        }

        transactions = transactionData || [];
      }

      // Process and format the data
      const formattedProducts = (products || []).map(product => ({
        id: product.id || '',
        name: product.name || '',
        quantity: product.quantity || 0,
        unit: product.unit || 'kg',
        price: product.price || 0,
        harvest_date: product.harvest_date || '',
        image_url: product.image_url || '',
        status: product.status || 'available',
        created_at: product.created_at || '',
        updated_at: product.updated_at || ''
      }));

      const formattedOrders = (orders || []).map(orderItem => ({
        id: orderItem.orders.id || '',
        order_item_id: orderItem.id || '',
        product_id: orderItem.product_id || '',
        product_name: orderItem.products?.name || '',
        quantity: orderItem.quantity || 0,
        unit: orderItem.products?.unit || 'kg',
        unit_price: orderItem.products?.price || 0,
        total_price: orderItem.total_price || 0,
        status: orderItem.orders.status || 'pending',
        delivery_address: orderItem.orders.delivery_address || '',
        notes: orderItem.orders.notes || '',
        ordered_at: orderItem.orders.ordered_at || '',
        confirmed_at: orderItem.orders.confirmed_at || '',
        delivered_at: orderItem.orders.delivered_at || '',
        completed_at: orderItem.orders.completed_at || '',
        created_at: orderItem.orders.created_at || '',
        updated_at: orderItem.orders.updated_at || '',
        retailer: {
          id: orderItem.orders.users?.id || '',
          full_name: orderItem.orders.users?.full_name || '',
          email: orderItem.orders.users?.email || '',
          phone: orderItem.orders.users?.phone || '',
          business_name: orderItem.orders.users?.business_name || ''
        }
      }));

      const formattedTransactions = (transactions || []).map(transaction => ({
        id: transaction.id || '',
        order_id: transaction.order_id || '',
        amount: transaction.amount || 0,
        payment_status: transaction.payment_status || 'pending',
        commission: transaction.commission || 0,
        payment_gateway: transaction.payment_gateway || '',
        paid_at: transaction.paid_at || '',
        created_at: transaction.created_at || '',
        updated_at: transaction.updated_at || ''
      }));

      // Format farmer data with null handling
      const formattedFarmer = {
        id: farmer.id || '',
        full_name: farmer.full_name || '',
        email: farmer.email || '',
        phone: farmer.phone || '',
        address: farmer.address || '',
        avatar_url: farmer.avatar_url || '',
        business_name: farmer.business_name || '',
        is_verified: farmer.is_verified || false,
        is_active: farmer.is_active || false,
        created_at: farmer.created_at || '',
        products: formattedProducts,
        orders: formattedOrders,
        transactions: formattedTransactions
      };

      return {
        farmer: formattedFarmer
      };
    } catch (error) {
      throw new Error(`Failed to get farmer dashboard: ${error.message}`);
    }
  }

  /**
   * Get farmer dashboard statistics
   * @param {string} farmerId - Farmer user ID
   * @returns {Object} - Dashboard statistics
   */
  async getFarmerStats(farmerId) {
    try {
      // Get product statistics
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('status')
        .eq('farmer_id', farmerId);

      if (productsError) {
        throw new Error(`Failed to fetch product stats: ${productsError.message}`);
      }

      const productStats = {
        total: products?.length || 0,
        available: products?.filter(p => p.status === 'available').length || 0,
        ordered: products?.filter(p => p.status === 'ordered').length || 0,
        sold: products?.filter(p => p.status === 'sold').length || 0
      };

      // Get order statistics
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          total_price,
          orders!inner (
            status,
            created_at
          ),
          products!inner (
            farmer_id
          )
        `)
        .eq('products.farmer_id', farmerId);

      if (orderItemsError) {
        throw new Error(`Failed to fetch order stats: ${orderItemsError.message}`);
      }

      const orderStats = {
        total: orderItems?.length || 0,
        pending: orderItems?.filter(item => item.orders.status === 'pending').length || 0,
        confirmed: orderItems?.filter(item => item.orders.status === 'confirmed').length || 0,
        delivered: orderItems?.filter(item => item.orders.status === 'delivered').length || 0,
        completed: orderItems?.filter(item => item.orders.status === 'completed').length || 0,
        cancelled: orderItems?.filter(item => item.orders.status === 'cancelled').length || 0,
        total_revenue: orderItems?.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0) || 0
      };

      // Get transaction statistics
      const orderIds = orderItems?.map(item => item.orders.id) || [];
      let transactionStats = {
        total: 0,
        paid: 0,
        pending: 0,
        failed: 0,
        total_commission: 0
      };

      if (orderIds.length > 0) {
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('payment_status, commission')
          .in('order_id', orderIds);

        if (!transactionsError && transactions) {
          transactionStats = {
            total: transactions.length,
            paid: transactions.filter(t => t.payment_status === 'paid').length,
            pending: transactions.filter(t => t.payment_status === 'pending').length,
            failed: transactions.filter(t => t.payment_status === 'failed').length,
            total_commission: transactions.reduce((sum, t) => sum + (parseFloat(t.commission) || 0), 0)
          };
        }
      }

      return {
        products: productStats,
        orders: orderStats,
        transactions: transactionStats
      };
    } catch (error) {
      throw new Error(`Failed to get farmer stats: ${error.message}`);
    }
  }
}

module.exports = new FarmerService();