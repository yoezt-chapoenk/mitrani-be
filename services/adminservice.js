const { supabase } = require('../config/supabase');

class AdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      // Get user counts by role
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('is_active', true);

      if (usersError) throw usersError;

      // Count users by role
      const userStats = {
        total: users.length,
        farmers: users.filter(u => u.role === 'farmer').length,
        retailers: users.filter(u => u.role === 'retailer').length,
        admins: users.filter(u => u.role === 'admin').length
      };

      // Get product count
      const { count: productCount, error: productError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (productError) throw productError;

      // Get order count
      const { count: orderCount, error: orderError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (orderError) throw orderError;

      // Get transaction count and revenue
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select('amount, status');

      if (transactionError) throw transactionError;

      const transactionStats = {
        total: transactions.length,
        completed: transactions.filter(t => t.status === 'completed').length,
        revenue: transactions
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + (t.amount || 0), 0)
      };

      return {
        users: userStats,
        products: productCount || 0,
        orders: orderCount || 0,
        transactions: transactionStats
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard stats: ${error.message}`);
    }
  }

  /**
   * Get all users with filtering and pagination
   */
  async getUsers(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        is_verified,
        is_active,
        search,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('users')
        .select('id, full_name, email, phone, role, address, business_name, is_verified, is_active, created_at', { count: 'exact' })
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range(from, to);

      // Apply filters
      if (role) {
        query = query.eq('role', role);
      }
      if (typeof is_verified !== 'undefined') {
        query = query.eq('is_verified', is_verified);
      }
      if (typeof is_active !== 'undefined') {
        query = query.eq('is_active', is_active);
      }
      if (search) {
        query = query.ilike('full_name', `%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total_items: count,
          total_pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('User not found');

      return data;
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Verify user
   */
  async verifyUser(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_verified: true, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('User not found');

      return data;
    } catch (error) {
      throw new Error(`Failed to verify user: ${error.message}`);
    }
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('User not found');

      return data;
    } catch (error) {
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  }

  /**
   * Activate user
   */
  async activateUser(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('User not found');

      return data;
    } catch (error) {
      throw new Error(`Failed to activate user: ${error.message}`);
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Get products with filtering and pagination
   */
  async getProducts(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        is_active,
        search,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range(from, to);

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }
      if (typeof is_active !== 'undefined') {
        query = query.eq('is_active', is_active);
      }
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total_items: count,
          total_pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get products: ${error.message}`);
    }
  }

  /**
   * Get orders with filtering and pagination
   */
  async getOrders(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        farmer_id,
        retailer_id,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('orders')
        .select(`
          *,
          farmer:farmer_id(id, full_name, email),
          retailer:retailer_id(id, full_name, email),
          product:product_id(id, name, price_per_kg)
        `, { count: 'exact' })
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range(from, to);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (farmer_id) {
        query = query.eq('farmer_id', farmer_id);
      }
      if (retailer_id) {
        query = query.eq('retailer_id', retailer_id);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total_items: count,
          total_pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get orders: ${error.message}`);
    }
  }

  /**
   * Get transactions with filtering, pagination, and statistics
   */
  async getTransactionsWithStats(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        type,
        user_id,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = options;

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('transactions')
        .select(`
          *,
          user:user_id(id, full_name, email, role),
          order:order_id(id, status)
        `, { count: 'exact' })
        .order(sort_by, { ascending: sort_order === 'asc' })
        .range(from, to);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (type) {
        query = query.eq('type', type);
      }
      if (user_id) {
        query = query.eq('user_id', user_id);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Calculate statistics
      const { data: allTransactions, error: statsError } = await supabase
        .from('transactions')
        .select('amount, status, commission_amount');

      if (statsError) throw statsError;

      const statistics = {
        total_transactions: allTransactions.length,
        completed_transactions: allTransactions.filter(t => t.status === 'completed').length,
        total_revenue: allTransactions
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + (t.amount || 0), 0),
        total_commission: allTransactions
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + (t.commission_amount || 0), 0)
      };

      return {
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total_items: count,
          total_pages: Math.ceil(count / limit)
        },
        statistics
      };
    } catch (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }
  }
}

module.exports = new AdminService();