const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from database to ensure user still exists and is active
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

/**
 * Middleware to authorize specific roles
 * @param {Array} roles - Array of allowed roles
 */
const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = authorizeRoles(['admin']);

/**
 * Middleware to check if user is farmer
 */
const requireFarmer = authorizeRoles(['farmer', 'admin']);

/**
 * Middleware to check if user is retailer
 */
const requireRetailer = authorizeRoles(['retailer', 'admin']);

/**
 * Middleware to check if user is farmer or retailer
 */
const requireFarmerOrRetailer = authorizeRoles(['farmer', 'retailer', 'admin']);

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireAdmin,
  requireFarmer,
  requireRetailer,
  requireFarmerOrRetailer
};