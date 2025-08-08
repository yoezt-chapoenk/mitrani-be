# Fixed WhatsApp OTP Implementation with Purpose Field

This document shows the corrected implementation that ensures the `purpose` field is always set when inserting OTP records into the `otp_verifications` table.

## 🔧 Database Schema Update

The `otp_verifications` table now includes a `purpose` field with proper constraints:

```sql
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('register', 'login')) DEFAULT 'register',
    user_data JSONB NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Changes:**
- Added `purpose` field with NOT NULL constraint
- Added CHECK constraint to ensure only 'register' or 'login' values
- Set default value to 'register' for backward compatibility

## 🛠️ Updated WhatsApp OTP Service

The `storeOTP` method now includes purpose validation:

```javascript
// services/whatsappOtpService.js
async storeOTP(phone, otp, userData, purpose = 'register') {
  try {
    // Validate purpose
    if (!['register', 'login'].includes(purpose)) {
      throw new Error('Invalid purpose. Must be either "register" or "login"');
    }

    // Clean up any existing OTP for this phone
    await supabase
      .from('otp_verifications')
      .delete()
      .eq('phone', phone)
      .eq('is_verified', false);

    // Store new OTP with purpose
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('otp_verifications')
      .insert({
        phone,
        otp_code: otp,
        purpose,           // ✅ Always included
        user_data: userData,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to store OTP: ' + error.message);
    }

    console.log('OTP stored successfully:', {
      phone,
      purpose,
      expires_at: expiresAt.toISOString()
    });

    return data;
  } catch (error) {
    console.error('Error storing OTP:', error);
    throw error;
  }
}
```

## 📱 Updated Express.js Route Handlers

### 1. Registration OTP Route

```javascript
// routes/authOtp.js - Registration endpoint
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').trim().isLength({ min: 2, max: 100 }),
  body('role').isIn(['farmer', 'retailer']),
  body('phone').matches(/^\+?[1-9]\d{1,14}$/),
  body('address').optional().trim().isLength({ min: 5, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, full_name, role, phone, address } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabase
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate OTP
    const otp = whatsappOtpService.generateOTP();

    // Store OTP with 'register' purpose ✅
    await whatsappOtpService.storeOTP(phone, otp, {
      email,
      password: hashedPassword,
      full_name,
      role,
      phone,
      address: address || null
    }, 'register'); // ✅ Purpose explicitly set

    // Send OTP via WhatsApp
    const sendResult = await whatsappOtpService.sendOTP(phone, otp, 'registration');

    res.status(200).json({
      success: true,
      message: 'OTP sent to your WhatsApp number. Please verify to complete registration.',
      data: {
        phone: sendResult.phone,
        expires_in: 300
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP'
    });
  }
});
```

### 2. Login OTP Request Route

```javascript
// routes/authOtp.js - Login OTP request endpoint
router.post('/request-login', [
  body('phone').matches(/^\+?[1-9]\d{1,14}$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { phone } = req.body;

    // Check if user exists
    const { data: user, error } = await supabase
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

    // Generate OTP
    const otp = whatsappOtpService.generateOTP();

    // Store OTP with 'login' purpose ✅
    await whatsappOtpService.storeOTP(phone, otp, {
      login: true,
      user_id: user.id
    }, 'login'); // ✅ Purpose explicitly set

    // Send OTP via WhatsApp
    const sendResult = await whatsappOtpService.sendOTP(phone, otp, 'login');

    res.status(200).json({
      success: true,
      message: 'OTP sent to your WhatsApp number for login verification.',
      data: {
        phone: sendResult.phone,
        expires_in: 300
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
```

### 3. OTP Verification Routes

```javascript
// Registration OTP Verification
router.post('/verify', [
  body('phone').matches(/^\+?[1-9]\d{1,14}$/),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Find OTP record with purpose validation ✅
    const { data: otpRecord, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('otp_code', otp)
      .eq('purpose', 'register') // ✅ Check purpose
      .eq('is_verified', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Verify OTP and create user...
    // (rest of verification logic)
  } catch (error) {
    // Error handling
  }
});

// Login OTP Verification
router.post('/verify-login', [
  body('phone').matches(/^\+?[1-9]\d{1,14}$/),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Find OTP record with purpose validation ✅
    const { data: otpRecord, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('otp_code', otp)
      .eq('purpose', 'login') // ✅ Check purpose
      .eq('is_verified', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Verify login OTP...
    // (rest of verification logic)
  } catch (error) {
    // Error handling
  }
});
```

## 🔒 Input Validation & Security

### Purpose Field Validation

```javascript
// Middleware for purpose validation
const validatePurpose = (req, res, next) => {
  const { purpose } = req.body;
  
  if (purpose && !['register', 'login'].includes(purpose)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid purpose. Must be either "register" or "login"'
    });
  }
  
  next();
};

// Usage in routes
router.post('/custom-otp-endpoint', [
  validatePurpose,
  body('phone').matches(/^\+?[1-9]\d{1,14}$/),
  // other validations
], async (req, res) => {
  // Route handler
});
```

### Enhanced Error Handling

```javascript
// Enhanced error handling for OTP operations
const handleOtpError = (error, res) => {
  console.error('OTP Error:', error);
  
  if (error.message.includes('purpose')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid OTP purpose specified',
      code: 'INVALID_PURPOSE'
    });
  }
  
  if (error.message.includes('not-null constraint')) {
    return res.status(500).json({
      success: false,
      message: 'Database constraint violation',
      code: 'DB_CONSTRAINT_ERROR'
    });
  }
  
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};
```

## 🚀 Future-Proofing Recommendations

### 1. Enum-based Validation

```javascript
// constants/otpPurposes.js
const OTP_PURPOSES = {
  REGISTER: 'register',
  LOGIN: 'login',
  PASSWORD_RESET: 'password_reset', // Future use
  PHONE_VERIFICATION: 'phone_verification' // Future use
};

const VALID_PURPOSES = Object.values(OTP_PURPOSES);

module.exports = { OTP_PURPOSES, VALID_PURPOSES };

// Usage in service
const { VALID_PURPOSES, OTP_PURPOSES } = require('../constants/otpPurposes');

async storeOTP(phone, otp, userData, purpose = OTP_PURPOSES.REGISTER) {
  if (!VALID_PURPOSES.includes(purpose)) {
    throw new Error(`Invalid purpose. Must be one of: ${VALID_PURPOSES.join(', ')}`);
  }
  // ... rest of method
}
```

### 2. Database Migration Script

```sql
-- Migration to add purpose field to existing table
ALTER TABLE otp_verifications 
ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) 
NOT NULL DEFAULT 'register' 
CHECK (purpose IN ('register', 'login'));

-- Update existing records (if any)
UPDATE otp_verifications 
SET purpose = 'register' 
WHERE purpose IS NULL;
```

### 3. Monitoring & Logging

```javascript
// Enhanced logging for OTP operations
const logOtpOperation = (operation, data) => {
  console.log(`OTP ${operation}:`, {
    timestamp: new Date().toISOString(),
    phone: data.phone?.replace(/.(?=.{4})/g, '*'), // Mask phone number
    purpose: data.purpose,
    success: data.success,
    error: data.error?.message
  });
};

// Usage
logOtpOperation('STORE', { phone, purpose, success: true });
logOtpOperation('VERIFY', { phone, purpose, success: false, error });
```

## ✅ Summary of Fixes

1. **Database Schema**: Added `purpose` field with NOT NULL constraint and CHECK validation
2. **Service Layer**: Updated `storeOTP` method to require and validate purpose parameter
3. **Route Handlers**: All OTP operations now explicitly set the purpose field
4. **Validation**: Added input validation for purpose field
5. **Error Handling**: Enhanced error messages for purpose-related issues
6. **Future-Proofing**: Provided enum-based validation and extensible architecture

The `purpose` field will now **never be null** when inserting OTP records, resolving the database constraint violation error.