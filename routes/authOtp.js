const express = require('express');
const bcrypt = require('bcryptjs');
const { validateUserRegistration } = require('../middlewares/validation');
const authService = require('../services/authService');
const whatsappOtpService = require('../services/whatsappOtpService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @route POST /api/auth-otp/register
 * @desc Register user with WhatsApp OTP verification
 * @access Public
 */
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('role')
    .isIn(['farmer', 'retailer'])
    .withMessage('Role must be either farmer or retailer'),
  body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('address')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Address is required and must be between 5 and 500 characters'),
  body('business_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Business name must be between 2 and 255 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, full_name, role, phone, address, business_name } = req.body;

    // Additional validation for address and business_name based on role
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    if (role === 'retailer' && !business_name) {
      return res.status(400).json({
        success: false,
        message: 'Business name is required for retailers'
      });
    }

    // Check if user already exists
    const { data: existingUser } = await require('../config/supabase').supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if phone already exists
    const { data: existingPhone } = await require('../config/supabase').supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Prepare user data for temporary storage
    const userData = {
      email,
      password_hash: hashedPassword,
      full_name,
      role,
      phone,
      address,
      business_name: business_name || null
    };

    // Generate OTP
    const otp = whatsappOtpService.generateOTP();

    // Store OTP with user data
    await whatsappOtpService.storeOTP(phone, otp, userData, 'register');

    // Send OTP via WhatsApp
    const sendResult = await whatsappOtpService.sendOTP(phone, otp);

    console.log('Registration OTP sent:', {
      phone: sendResult.phone,
      messageId: sendResult.messageId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent to your WhatsApp number. Please verify to complete registration.',
      data: {
        phone: sendResult.phone,
        expires_in: 300 // 5 minutes
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route POST /api/auth-otp/verify
 * @desc Verify OTP and complete user registration
 * @access Public
 */
router.post('/verify', [
  body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone, otp } = req.body;

    console.log('📥 Registration OTP Verification Request:', {
      phone: phone?.replace(/.(?=.{4})/g, '*'),
      otp: otp?.replace(/.(?=.{2})/g, '*'),
      timestamp: new Date().toISOString()
    });

    // Verify OTP and get user data with purpose 'register'
    const userData = await whatsappOtpService.verifyOTP(phone, otp, 'register');

    // Create user in database
    const { data: user, error } = await require('../config/supabase').supabase
      .from('users')
      .insert({
        ...userData,
        is_verified: true, // Mark as verified since OTP was successful
        is_active: true
      })
      .select('id, email, full_name, role, phone, address, business_name, is_verified, is_active, created_at')
      .single();

    if (error) {
      throw new Error('Failed to create user: ' + error.message);
    }

    // Generate JWT token
    const token = authService.generateToken(user.id);

    console.log('✅ User registration completed:', {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('❌ Registration OTP verification error:', error);
    
    // Provide specific error messages
    let errorMessage = error.message || 'OTP verification failed';
    if (error.message.includes('OTP not found')) {
      errorMessage = 'Invalid OTP or OTP has expired. Please request a new OTP.';
    } else if (error.message.includes('Maximum OTP attempts')) {
      errorMessage = 'Too many failed attempts. Please request a new OTP.';
    }
    
    res.status(400).json({
      success: false,
      message: errorMessage
    });
  }
});

/**
 * @route POST /api/auth-otp/resend
 * @desc Resend OTP for registration
 * @access Public
 */
router.post('/resend', [
  body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone } = req.body;

    // Find existing OTP record
    const { data: otpRecord, error } = await require('../config/supabase').supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !otpRecord) {
      return res.status(404).json({
        success: false,
        message: 'No pending registration found for this phone number'
      });
    }

    // Check if last OTP was sent less than 1 minute ago
    const lastSent = new Date(otpRecord.created_at);
    const now = new Date();
    const timeDiff = (now - lastSent) / 1000; // in seconds

    if (timeDiff < 60) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${60 - Math.floor(timeDiff)} seconds before requesting a new OTP`
      });
    }

    // Generate new OTP
    const newOtp = whatsappOtpService.generateOTP();

    // Update existing record with new OTP
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    await require('../config/supabase').supabase
      .from('otp_verifications')
      .update({
        otp_code: newOtp,
        attempts: 0,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })
      .eq('id', otpRecord.id);

    // Send new OTP with correct message type based on purpose
    const messageType = otpRecord.purpose || 'registration';
    const sendResult = await whatsappOtpService.sendOTP(phone, newOtp, messageType);

    console.log('OTP resent:', {
      phone: sendResult.phone,
      messageId: sendResult.messageId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your WhatsApp number',
      data: {
        phone: sendResult.phone,
        expires_in: 300 // 5 minutes
      }
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to resend OTP'
    });
  }
});

/**
 * @route POST /api/auth-otp/request-login
 * @desc Request OTP for login via WhatsApp
 * @access Public
 */
router.post('/request-login', [
  body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone } = req.body;

    // Check if user exists with this phone number
    const { data: user, error } = await require('../config/supabase').supabase
      .from('users')
      .select('id, email, full_name, role, is_active')
      .eq('phone', phone)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'No active user found with this phone number'
      });
    }

    // Check for existing pending login OTP
    const { data: existingOtp } = await require('../config/supabase').supabase
      .from('otp_verifications')
      .select('created_at')
      .eq('phone', phone)
      .eq('is_verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Check cooldown period (1 minute)
    if (existingOtp) {
      const lastSent = new Date(existingOtp.created_at);
      const now = new Date();
      const timeDiff = (now - lastSent) / 1000; // in seconds

      if (timeDiff < 60) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${60 - Math.floor(timeDiff)} seconds before requesting a new OTP`
        });
      }
    }

    // Generate OTP
    const otp = whatsappOtpService.generateOTP();

    // Store OTP for login using the service method
    await whatsappOtpService.storeOTP(phone, otp, {
      login: true,
      user_id: user.id
    }, 'login');

    // Send OTP via WhatsApp
    const sendResult = await whatsappOtpService.sendOTP(phone, otp, 'login');

    console.log('Login OTP sent:', {
      phone: sendResult.phone,
      userId: user.id,
      messageId: sendResult.messageId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent to your WhatsApp number for login verification.',
      data: {
        phone: sendResult.phone,
        expires_in: 300 // 5 minutes
      }
    });

  } catch (error) {
    console.error('Login OTP request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send login OTP'
    });
  }
});

/**
 * @route POST /api/auth-otp/verify-login
 * @desc Verify OTP for login
 * @access Public
 */
router.post('/verify-login', [
  body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone, otp } = req.body;

    console.log('📥 Login OTP Verification Request:', {
      phone: phone?.replace(/.(?=.{4})/g, '*'),
      otp: otp?.replace(/.(?=.{2})/g, '*'),
      timestamp: new Date().toISOString()
    });

    // Verify OTP with purpose 'login'
    const userData = await whatsappOtpService.verifyOTP(phone, otp, 'login');

    // Get user data
    const { data: user, error: userError } = await require('../config/supabase').supabase
      .from('users')
      .select('id, email, full_name, role, phone, address, is_verified, is_active, created_at')
      .eq('id', userData.user_id)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Generate JWT token
    const token = authService.generateToken(user.id);

    console.log('✅ User login via OTP completed:', {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('❌ Login OTP verification error:', error);
    
    // Provide specific error messages
    let errorMessage = error.message || 'Login OTP verification failed';
    if (error.message.includes('OTP not found')) {
      errorMessage = 'Invalid OTP or OTP has expired. Please request a new OTP.';
    } else if (error.message.includes('Maximum OTP attempts')) {
      errorMessage = 'Too many failed attempts. Please request a new OTP.';
    } else if (error.message.includes('not for login')) {
      errorMessage = 'This OTP is not for login verification.';
    }
    
    res.status(400).json({
      success: false,
      message: errorMessage
    });
  }
});

/**
 * @route GET /api/auth-otp/cleanup
 * @desc Clean up expired OTP records (for maintenance)
 * @access Public (should be protected in production)
 */
router.get('/cleanup', async (req, res) => {
  try {
    await whatsappOtpService.cleanupExpiredOTPs();
    
    res.status(200).json({
      success: true,
      message: 'Expired OTP records cleaned up successfully'
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup expired OTPs'
    });
  }
});

module.exports = router;