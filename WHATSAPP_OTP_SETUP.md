# WhatsApp OTP Registration Setup Guide

This guide explains how to set up and use the WhatsApp OTP verification system for user registration.

## 🚀 Features Added

### New Database Table
- **`otp_verifications`** - Stores OTP codes and temporary user registration data

### New API Endpoints
- `POST /api/auth-otp/register` - Start registration with WhatsApp OTP
- `POST /api/auth-otp/verify` - Verify OTP and complete registration
- `POST /api/auth-otp/resend` - Resend OTP if needed
- `GET /api/auth-otp/cleanup` - Clean up expired OTP records

### New Service
- **WhatsAppOtpService** - Handles OTP generation, WhatsApp messaging, and verification

## 📋 Database Setup

### Step 1: Apply Database Schema
You need to apply the updated schema to your Supabase database:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `database/schema.sql`
4. Run the SQL to create all tables including the new `otp_verifications` table

### Step 2: Verify Table Creation
The new table structure:
```sql
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    user_data JSONB NOT NULL, -- Store registration data temporarily
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Wablas.com API Configuration

### API Key
The system is configured to use Wablas.com API with the provided key:
```
pXPEg2ia163QKnampAGHoTo8s5B4rXsKPwoOchEFG3lg24Y0Yc3MxGO
```

### Phone Number Format
The system automatically formats phone numbers:
- Removes non-numeric characters
- Converts Indonesian numbers (starting with 0) to international format (62)
- Ensures proper country code format

## 📱 API Usage Examples

### 1. Register User with WhatsApp OTP
```bash
curl -X POST http://localhost:3000/api/auth-otp/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "farmer@example.com",
    "password": "securepassword123",
    "full_name": "John Farmer",
    "phone": "+6281234567890",
    "role": "farmer",
    "address": "Jl. Pertanian No. 123, Jakarta"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your WhatsApp number. Please verify to complete registration.",
  "data": {
    "phone": "6281234567890",
    "expires_in": 300
  }
}
```

### 2. Verify OTP
```bash
curl -X POST http://localhost:3000/api/auth-otp/verify \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+6281234567890",
    "otp": "123456"
  }'
```

**Response:**
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
      "is_verified": true,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token-here"
  }
}
```

### 3. Resend OTP
```bash
curl -X POST http://localhost:3000/api/auth-otp/resend \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+6281234567890"
  }'
```

## 🔒 Security Features

### OTP Security
- **6-digit random OTP** generation
- **5-minute expiration** time
- **Maximum 3 attempts** per OTP
- **1-minute cooldown** between resend requests
- **Automatic cleanup** of expired OTPs

### Data Protection
- User data stored temporarily in JSONB format
- Passwords hashed with bcrypt before storage
- OTP records automatically cleaned up after expiration
- Phone number validation and formatting

## 🧪 Testing Steps

### Prerequisites
1. ✅ Database schema applied
2. ✅ Server running on port 3000
3. ✅ Wablas.com API accessible
4. ✅ Valid WhatsApp number for testing

### Test Flow
1. **Register** - Send registration request with phone number
2. **Receive OTP** - Check WhatsApp for OTP message
3. **Verify** - Submit OTP to complete registration
4. **Login** - Use the returned JWT token for authenticated requests

### Sample WhatsApp Message
```
🔐 Kode OTP Anda: *123456*

Kode ini berlaku selama 5 menit.
Jangan bagikan kode ini kepada siapapun.

_Farm-to-Market Platform_
```

## 🐛 Troubleshooting

### Common Issues

1. **"Table 'otp_verifications' not found"**
   - Solution: Apply the database schema from `database/schema.sql`

2. **"Failed to send OTP"**
   - Check Wablas.com API status
   - Verify phone number format
   - Check network connectivity

3. **"OTP expired"**
   - OTPs expire after 5 minutes
   - Use the resend endpoint to get a new OTP

4. **"Maximum attempts exceeded"**
   - Each OTP allows 3 verification attempts
   - Use resend to get a new OTP

### Debug Logs
The system provides comprehensive logging:
- OTP generation and sending
- WhatsApp API responses
- Verification attempts
- Error details with stack traces

## 🔄 Maintenance

### Cleanup Expired OTPs
Run the cleanup endpoint periodically:
```bash
curl http://localhost:3000/api/auth-otp/cleanup
```

Or set up a cron job to clean expired records automatically.

## 📊 Monitoring

### Key Metrics to Monitor
- OTP delivery success rate
- Verification success rate
- Average time between OTP send and verification
- Failed verification attempts

### Logs to Watch
- WhatsApp API response codes
- OTP generation and verification events
- Database operation errors
- Network timeout issues

---

## 🚀 Next Steps

1. **Apply Database Schema** - Run the SQL from `database/schema.sql`
2. **Test Registration Flow** - Use the provided curl examples
3. **Integrate Frontend** - Connect your frontend to these endpoints
4. **Monitor Performance** - Set up logging and monitoring
5. **Production Deployment** - Configure rate limiting and security headers

The WhatsApp OTP registration system is now ready for use! 🎉