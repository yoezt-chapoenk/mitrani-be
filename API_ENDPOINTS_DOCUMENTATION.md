# 📚 Mitrani Backend API Endpoints Documentation

Comprehensive documentation for all authentication endpoints with WhatsApp OTP functionality, including sample requests, responses, and validation rules.

## 🔐 Authentication Endpoints

### 1. POST /api/auth-otp/register
**Description:** User registration with WhatsApp OTP verification
**Access:** Public

#### Request Body Validation:
```javascript
{
  email: {
    type: 'string',
    format: 'email',
    required: true,
    description: 'Valid email address'
  },
  password: {
    type: 'string',
    minLength: 6,
    required: true,
    description: 'Password with minimum 6 characters'
  },
  full_name: {
    type: 'string',
    minLength: 2,
    maxLength: 100,
    required: true,
    description: 'User full name'
  },
  role: {
    type: 'string',
    enum: ['farmer', 'retailer'],
    required: true,
    description: 'User role'
  },
  phone: {
    type: 'string',
    pattern: '^\\+?[1-9]\\d{1,14}$',
    required: true,
    description: 'Valid phone number with country code'
  },
  address: {
    type: 'string',
    minLength: 5,
    maxLength: 500,
    required: false,
    description: 'User address'
  }
}
```

#### Sample Request:
```bash
curl -X POST http://localhost:3000/api/auth-otp/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "password": "securepass123",
    "full_name": "John Farmer",
    "role": "farmer",
    "phone": "+6281234567890",
    "address": "Jl. Pertanian No. 123, Jakarta"
  }'
```

#### Sample Response (Success):
```json
{
  "success": true,
  "message": "OTP sent to your WhatsApp number. Please verify to complete registration.",
  "data": {
    "phone": "+6281234567890",
    "expires_in": 300
  }
}
```

#### Sample Response (Error):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

---

### 2. POST /api/auth/login
**Description:** Standard user login with email and password
**Access:** Public

#### Request Body Validation:
```javascript
{
  email: {
    type: 'string',
    format: 'email',
    required: true,
    description: 'User email address'
  },
  password: {
    type: 'string',
    required: true,
    description: 'User password'
  }
}
```

#### Sample Request:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "password": "securepass123"
  }'
```

#### Sample Response (Success):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "farmer@example.com",
      "full_name": "John Farmer",
      "role": "farmer",
      "phone": "+6281234567890",
      "is_verified": true,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Sample Response (Error):
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3. POST /api/auth-otp/verify
**Description:** Verify OTP code for registration completion
**Access:** Public

#### Request Body Validation:
```javascript
{
  phone: {
    type: 'string',
    pattern: '^\\+?[1-9]\\d{1,14}$',
    required: true,
    description: 'Phone number used for registration'
  },
  otp: {
    type: 'string',
    length: 6,
    pattern: '^[0-9]{6}$',
    required: true,
    description: '6-digit OTP code'
  }
}
```

#### Sample Request:
```bash
curl -X POST http://localhost:3000/api/auth-otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+6281234567890",
    "otp": "123456"
  }'
```

#### Sample Response (Success):
```json
{
  "success": true,
  "message": "Registration completed successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "farmer@example.com",
      "full_name": "John Farmer",
      "role": "farmer",
      "phone": "+6281234567890",
      "address": "Jl. Pertanian No. 123, Jakarta",
      "is_verified": true,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Sample Response (Error):
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

---

### 4. POST /api/auth-otp/request-login
**Description:** Request OTP for login via WhatsApp
**Access:** Public

#### Request Body Validation:
```javascript
{
  phone: {
    type: 'string',
    pattern: '^\\+?[1-9]\\d{1,14}$',
    required: true,
    description: 'Registered phone number'
  }
}
```

#### Sample Request:
```bash
curl -X POST http://localhost:3000/api/auth-otp/request-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+6281234567890"
  }'
```

#### Sample Response (Success):
```json
{
  "success": true,
  "message": "OTP sent to your WhatsApp number for login verification.",
  "data": {
    "phone": "+6281234567890",
    "expires_in": 300
  }
}
```

#### Sample Response (Error):
```json
{
  "success": false,
  "message": "No active user found with this phone number"
}
```

---

### 5. POST /api/auth-otp/verify-login
**Description:** Verify OTP for login completion
**Access:** Public

#### Request Body Validation:
```javascript
{
  phone: {
    type: 'string',
    pattern: '^\\+?[1-9]\\d{1,14}$',
    required: true,
    description: 'Phone number used for login request'
  },
  otp: {
    type: 'string',
    length: 6,
    pattern: '^[0-9]{6}$',
    required: true,
    description: '6-digit OTP code'
  }
}
```

#### Sample Request:
```bash
curl -X POST http://localhost:3000/api/auth-otp/verify-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+6281234567890",
    "otp": "654321"
  }'
```

#### Sample Response (Success):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "farmer@example.com",
      "full_name": "John Farmer",
      "role": "farmer",
      "phone": "+6281234567890",
      "address": "Jl. Pertanian No. 123, Jakarta",
      "is_verified": true,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Sample Response (Error):
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

---

## 🔧 Additional Endpoints

### POST /api/auth-otp/resend
**Description:** Resend OTP for registration
**Access:** Public

#### Sample Request:
```bash
curl -X POST http://localhost:3000/api/auth-otp/resend \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+6281234567890"
  }'
```

### GET /api/auth-otp/cleanup
**Description:** Clean up expired OTP records
**Access:** Public (should be protected in production)

#### Sample Request:
```bash
curl -X GET http://localhost:3000/api/auth-otp/cleanup
```

---

## 🛡️ Security Features

### OTP Security
- **6-digit random OTP** generation
- **5-minute expiration** time
- **Maximum 3 attempts** per OTP
- **1-minute cooldown** between resend requests
- **Automatic cleanup** of expired OTPs

### Validation Rules
- **Email validation** with normalization
- **Phone number validation** with international format
- **Password strength** minimum 6 characters
- **Role validation** (farmer/retailer only)
- **Input sanitization** and trimming

### Error Handling
- **Structured error responses** with field-specific messages
- **Rate limiting** for OTP requests
- **Attempt tracking** for security
- **Comprehensive logging** for debugging

---

## 🔗 Modular Routing Structure

### File Organization:
```
routes/
├── auth.js          # Standard authentication (login, register, profile)
├── authOtp.js       # WhatsApp OTP authentication
├── users.js         # User management
├── products.js      # Product management
├── orders.js        # Order management
├── admin.js         # Admin functions
├── upload.js        # File upload
└── notifications.js # Notification system
```

### Middleware Integration:
```javascript
// server.js
app.use('/api/auth', authRoutes);           // Standard auth
app.use('/api/auth-otp', authOtpRoutes);    // WhatsApp OTP auth
app.use('/api/users', userRoutes);          // User management
// ... other routes
```

### Service Layer:
```
services/
├── authService.js        # JWT token management
├── whatsappOtpService.js # WhatsApp OTP integration
├── userService.js        # User operations
└── ...
```

---

## 🧪 Testing Examples

### Complete Registration Flow:
```bash
# 1. Start registration
curl -X POST http://localhost:3000/api/auth-otp/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","full_name":"Test User","role":"farmer","phone":"+6281234567890"}'

# 2. Verify OTP (replace 123456 with actual OTP from WhatsApp)
curl -X POST http://localhost:3000/api/auth-otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+6281234567890","otp":"123456"}'
```

### Complete Login Flow:
```bash
# 1. Request login OTP
curl -X POST http://localhost:3000/api/auth-otp/request-login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+6281234567890"}'

# 2. Verify login OTP
curl -X POST http://localhost:3000/api/auth-otp/verify-login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+6281234567890","otp":"654321"}'
```

### Authenticated Request:
```bash
# Use JWT token from login response
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📱 Frontend Integration

### React/Next.js Example:
```javascript
// utils/api.js
const API_BASE_URL = 'http://localhost:3000/api';

export const authAPI = {
  // WhatsApp OTP Registration
  registerWithOTP: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth-otp/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  },
  
  // Verify Registration OTP
  verifyRegistrationOTP: async (phone, otp) => {
    const response = await fetch(`${API_BASE_URL}/auth-otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });
    return response.json();
  },
  
  // Request Login OTP
  requestLoginOTP: async (phone) => {
    const response = await fetch(`${API_BASE_URL}/auth-otp/request-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    return response.json();
  },
  
  // Verify Login OTP
  verifyLoginOTP: async (phone, otp) => {
    const response = await fetch(`${API_BASE_URL}/auth-otp/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });
    return response.json();
  },
  
  // Standard Login
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }
};
```

---

## 🚀 Production Considerations

### Environment Variables:
```env
# WhatsApp API Configuration
WABLAS_API_KEY=your-wablas-api-key
WABLAS_BASE_URL=https://console.wablas.com/api

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Database Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Security Recommendations:
1. **Rate Limiting**: Implement stricter rate limits for OTP endpoints
2. **IP Blocking**: Block suspicious IP addresses
3. **Monitoring**: Set up alerts for failed OTP attempts
4. **Cleanup**: Schedule regular cleanup of expired OTP records
5. **Logging**: Implement comprehensive audit logging

---

*This documentation covers all authentication endpoints with comprehensive examples and security considerations for the Mitrani Backend API.*