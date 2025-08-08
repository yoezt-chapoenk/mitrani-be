const { supabase } = require('../config/supabase');

class NotificationService {
  /**
   * Create a new notification
   * @param {Object} notificationData - Notification data
   * @returns {Object} - Created notification
   */
  async createNotification(notificationData) {
    const {
      user_id,
      title,
      message,
      type = 'info',
      related_id = null,
      related_type = null
    } = notificationData;

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title,
        message,
        type,
        related_id,
        related_type,
        is_read: false
      })
      .select('*')
      .single();

    if (error) {
      throw new Error('Failed to create notification: ' + error.message);
    }

    return notification;
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} - Notifications and pagination info
   */
  async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      is_read,
      type,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply filters
    if (typeof is_read === 'boolean') {
      query = query.eq('is_read', is_read);
    }

    if (type) {
      query = query.eq('type', type);
    }

    // Apply sorting
    const ascending = sort_order === 'asc';
    query = query.order(sort_by, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error, count } = await query;

    if (error) {
      throw new Error('Failed to fetch notifications: ' + error.message);
    }

    const totalPages = Math.ceil(count / limit);

    return {
      notifications,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: count,
        items_per_page: limit,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    };
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   * @returns {Object} - Updated notification
   */
  async markAsRead(notificationId, userId) {
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      throw new Error('Failed to mark notification as read: ' + error.message);
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {number} - Number of notifications marked as read
   */
  async markAllAsRead(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('id');

    if (error) {
      throw new Error('Failed to mark all notifications as read: ' + error.message);
    }

    return data.length;
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   * @returns {boolean} - Success status
   */
  async deleteNotification(notificationId, userId) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to delete notification: ' + error.message);
    }

    return true;
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {number} - Unread notification count
   */
  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw new Error('Failed to get unread count: ' + error.message);
    }

    return count;
  }

  /**
   * Send order status notification
   * @param {Object} orderData - Order data
   * @param {string} newStatus - New order status
   * @returns {Array} - Created notifications
   */
  async sendOrderStatusNotification(orderData, newStatus) {
    const notifications = [];

    // Notification for retailer
    const retailerNotification = await this.createNotification({
      user_id: orderData.retailer_id,
      title: 'Order Status Updated',
      message: `Your order #${orderData.id.slice(-8)} status has been updated to ${newStatus}`,
      type: 'order',
      related_id: orderData.id,
      related_type: 'order'
    });
    notifications.push(retailerNotification);

    // Notifications for farmers (if order contains their products)
    if (orderData.order_items) {
      const farmerIds = [...new Set(orderData.order_items.map(item => item.farmer_id))];
      
      for (const farmerId of farmerIds) {
        const farmerNotification = await this.createNotification({
          user_id: farmerId,
          title: 'Order Status Updated',
          message: `Order #${orderData.id.slice(-8)} containing your products has been updated to ${newStatus}`,
          type: 'order',
          related_id: orderData.id,
          related_type: 'order'
        });
        notifications.push(farmerNotification);
      }
    }

    return notifications;
  }

  /**
   * Send new order notification to farmers
   * @param {Object} orderData - Order data
   * @returns {Array} - Created notifications
   */
  async sendNewOrderNotification(orderData) {
    const notifications = [];

    if (orderData.order_items) {
      const farmerIds = [...new Set(orderData.order_items.map(item => item.farmer_id))];
      
      for (const farmerId of farmerIds) {
        const notification = await this.createNotification({
          user_id: farmerId,
          title: 'New Order Received',
          message: `You have received a new order #${orderData.id.slice(-8)} for your products`,
          type: 'order',
          related_id: orderData.id,
          related_type: 'order'
        });
        notifications.push(notification);
      }
    }

    return notifications;
  }

  /**
   * Send user verification notification
   * @param {string} userId - User ID
   * @param {string} userName - User name
   * @returns {Object} - Created notification
   */
  async sendUserVerificationNotification(userId, userName) {
    return this.createNotification({
      user_id: userId,
      title: 'Account Verified',
      message: `Congratulations ${userName}! Your account has been verified and you can now access all features.`,
      type: 'account',
      related_id: userId,
      related_type: 'user'
    });
  }

  /**
   * Send low stock notification to farmer
   * @param {string} farmerId - Farmer ID
   * @param {Object} productData - Product data
   * @returns {Object} - Created notification
   */
  async sendLowStockNotification(farmerId, productData) {
    return this.createNotification({
      user_id: farmerId,
      title: 'Low Stock Alert',
      message: `Your product "${productData.name}" is running low on stock (${productData.stock_quantity} remaining)`,
      type: 'stock',
      related_id: productData.id,
      related_type: 'product'
    });
  }

  /**
   * Send welcome notification to new user
   * @param {string} userId - User ID
   * @param {string} userName - User name
   * @param {string} userRole - User role
   * @returns {Object} - Created notification
   */
  async sendWelcomeNotification(userId, userName, userRole) {
    const roleMessages = {
      'farmer': 'Start by adding your products to reach more customers!',
      'retailer': 'Explore fresh products from local farmers and place your first order!',
      'admin': 'Welcome to the admin dashboard. You can manage users and monitor the platform.'
    };

    return this.createNotification({
      user_id: userId,
      title: 'Welcome to Mitrani!',
      message: `Hello ${userName}! Welcome to our farm-to-market platform. ${roleMessages[userRole] || 'Enjoy using our platform!'}`,
      type: 'welcome',
      related_id: userId,
      related_type: 'user'
    });
  }

  /**
   * Clean up old notifications (older than 30 days)
   * @returns {number} - Number of deleted notifications
   */
  async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('id');

    if (error) {
      throw new Error('Failed to cleanup old notifications: ' + error.message);
    }

    return data.length;
  }
}

module.exports = new NotificationService();