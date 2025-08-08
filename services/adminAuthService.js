const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

class AdminAuthService {
  constructor() {
    // Rate limiting storage (in production, use Redis)
    this.loginAttempts = new Map();
    this.maxAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Admin-specific login with enhanced security
   * @param {string} email - Admin email
   * @param {string} password - Admin password
   * @param {string} clientIP - Client IP address for rate limiting
   * @returns {Object} - Admin user data and token
   */
  async adminLogin(email, password, clientIP) {
    // Check rate limiting
    this.checkRateLimit(clientIP);

    try {
      // Find user by email with admin role check
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('role', 'admin')
        .eq('is_active', true)
        .single();

      // Check if admin user exists
      if (error || !user) {
        this.recordFailedAttempt(clientIP);
        throw new Error('Invalid admin credentials');
      }

      // Check if password hash exists
      if (!user.password_hash) {
        this.recordFailedAttempt(clientIP);
        throw new Error('Invalid admin credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        this.recordFailedAttempt(clientIP);
        throw new Error('Invalid admin credentials');
      }

      // Double-check role (extra security)
      if (user.role !== 'admin') {
        this.recordFailedAttempt(clientIP);
        throw new Error('Access denied: Admin privileges required');
      }

      // Clear failed attempts on successful login
      this.clearFailedAttempts(clientIP);

      // Generate admin-specific JWT token with enhanced claims
      const token = this.generateAdminToken(user.id, user.role);

      // Log successful admin login
      console.log(`🔐 Admin login successful: ${user.email} from IP: ${clientIP}`);

      // Remove password hash from response
      const { password_hash: _, ...adminWithoutPassword } = user;

      return {
        user: adminWithoutPassword,
        token,
        loginTime: new Date().toISOString()
      };
    } catch (error) {
      // Log failed admin login attempt
      console.warn(`🚨 Admin login failed: ${email} from IP: ${clientIP} - ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate admin-specific JWT token with enhanced security
   * @param {string} userId - Admin user ID
   * @param {string} role - User role (should be 'admin')
   * @returns {string} - JWT token
   */
  generateAdminToken(userId, role) {
    const payload = {
      userId,
      role,
      type: 'admin_access',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'mitrani-admin',
        audience: 'mitrani-admin-panel'
      }
    );
  }

  /**
   * Check rate limiting for IP address
   * @param {string} clientIP - Client IP address
   */
  checkRateLimit(clientIP) {
    const attempts = this.loginAttempts.get(clientIP);
    
    if (attempts) {
      const { count, lastAttempt } = attempts;
      const timeSinceLastAttempt = Date.now() - lastAttempt;
      
      // Reset attempts if lockout duration has passed
      if (timeSinceLastAttempt > this.lockoutDuration) {
        this.loginAttempts.delete(clientIP);
        return;
      }
      
      // Check if max attempts exceeded
      if (count >= this.maxAttempts) {
        const remainingTime = Math.ceil((this.lockoutDuration - timeSinceLastAttempt) / 1000 / 60);
        throw new Error(`Too many failed login attempts. Please try again in ${remainingTime} minutes.`);
      }
    }
  }

  /**
   * Record failed login attempt
   * @param {string} clientIP - Client IP address
   */
  recordFailedAttempt(clientIP) {
    const attempts = this.loginAttempts.get(clientIP) || { count: 0, lastAttempt: 0 };
    attempts.count += 1;
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(clientIP, attempts);
  }

  /**
   * Clear failed attempts for IP address
   * @param {string} clientIP - Client IP address
   */
  clearFailedAttempts(clientIP) {
    this.loginAttempts.delete(clientIP);
  }

  /**
   * Get current rate limit status for IP
   * @param {string} clientIP - Client IP address
   * @returns {Object} - Rate limit status
   */
  getRateLimitStatus(clientIP) {
    const attempts = this.loginAttempts.get(clientIP);
    
    if (!attempts) {
      return {
        isLocked: false,
        attemptsRemaining: this.maxAttempts,
        lockoutTimeRemaining: 0
      };
    }
    
    const now = Date.now();
    const timeSinceLastAttempt = now - attempts.lastAttempt;
    const isLocked = attempts.count >= this.maxAttempts && timeSinceLastAttempt < this.lockoutDuration;
    
    return {
      isLocked,
      attemptsRemaining: Math.max(0, this.maxAttempts - attempts.count),
      lockoutTimeRemaining: isLocked ? Math.max(0, this.lockoutDuration - timeSinceLastAttempt) : 0,
      lastAttemptTime: attempts.lastAttempt ? new Date(attempts.lastAttempt).toISOString() : null
    };
  }
}

module.exports = new AdminAuthService();