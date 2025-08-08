const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} - Created user and token
   */
  async register(userData) {
    const { email, password, full_name, role, phone, address } = userData;

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: hashedPassword,
        full_name,
        role,
        phone,
        address,
        is_verified: false,
        is_active: true
      })
      .select('id, email, full_name, role, phone, address, is_verified, is_active, created_at')
      .single();

    if (error) {
      throw new Error('Failed to create user: ' + error.message);
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    return {
      user,
      token
    };
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} - User data and token
   */
  async login(email, password) {
    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    // Check if user exists
    if (error || !user) {
      throw new Error('User not found');
    }

    // Check if password hash exists
    if (!user.password_hash) {
      throw new Error('Invalid credentials');
    }

    // Check password using correct column name
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Remove password hash from response
    const { password_hash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token
    };
  }

  /**
   * Generate JWT token
   * @param {string} userId - User ID
   * @returns {string} - JWT token
   */
  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token
   */
  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Object} - User profile
   */
  async getUserProfile(userId) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, phone, address, is_verified, is_active, created_at, updated_at')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Object} - Updated user profile
   */
  async updateProfile(userId, updateData) {
    const allowedFields = ['full_name', 'phone', 'address'];
    const filteredData = {};

    // Filter only allowed fields
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      throw new Error('No valid fields to update');
    }

    filteredData.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(filteredData)
      .eq('id', userId)
      .select('id, email, full_name, role, phone, address, is_verified, is_active, created_at, updated_at')
      .single();

    if (error) {
      throw new Error('Failed to update profile: ' + error.message);
    }

    return user;
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} - Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    // Get user with password hash
    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Check if password hash exists
    if (!user.password_hash) {
      throw new Error('Invalid credentials');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password hash
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error('Failed to update password: ' + updateError.message);
    }

    return true;
  }
}

module.exports = new AuthService();