# Admin Access Control Implementation

This document outlines the complete admin access control implementation for the Mitrani Backend API.

## 🔐 Admin Authentication & Authorization

### Middleware Implementation

The admin access control is implemented using a layered middleware approach:

1. **Authentication Middleware** (`authenticateToken`)
   - Validates JWT tokens
   - Fetches user data from database
   - Ensures user is active

2. **Authorization Middleware** (`requireAdmin`)
   - Checks if authenticated user has 'admin' role
   - Returns 403 Forbidden for non-admin users

### Middleware Code

```javascript
// middlewares/auth.js
const requireAdmin = authorizeRoles(['admin']);

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
```

## 🛡️ Protected Admin Routes

All admin routes are protected at the router level:

```javascript
// routes/admin.js
const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);
```

### Available Admin Endpoints

- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - List all users with filtering
- `GET /api/admin/users/:id` - Get specific user details
- `PATCH /api/admin/users/:id/verify` - Verify user account
- `PATCH /api/admin/users/:id/deactivate` - Deactivate user
- `PATCH /api/admin/users/:id/activate` - Activate user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/transactions` - View all transactions
- `GET /api/admin/users/stats` - User statistics
- `POST /api/admin/notifications/cleanup` - Clean up notifications
- `GET /api/admin/system/health` - System health check

## 👤 Manual Admin User Creation

### SQL Script

Use the provided SQL script to manually create an admin user:

```sql
-- File: database/create-admin-user.sql
INSERT INTO public.users (
    id,
    full_name,
    email,
    password_hash,
    phone,
    role,
    is_verified,
    is_active,
    created_at,
    updated_at
)
VALUES (
    uuid_generate_v4(),
    'SuperAdmin',
    'warungames@gmail.com',
    '$2a$12$KkvPIvMIxUKEUAgXEMgbO.RG2pw6Xf64a7Gc9gw6mAK2Q/HA20IIW',
    '085226006886',
    'admin',
    true,
    true,
    now(),
    now()
);
```

### Admin Credentials

- **Email**: warungames@gmail.com
- **Password**: Boncell!23
- **Role**: admin
- **Phone**: 085226006886

## 🔒 Security Features

### Password Security
- Passwords are hashed using bcrypt with 12 salt rounds
- No plain text passwords stored in database

### Token Security
- JWT tokens required for all admin operations
- Tokens validated on every request
- User status checked (must be active)

### Role-Based Access
- Strict role checking (only 'admin' role allowed)
- Middleware applied at router level (cannot be bypassed)
- 403 Forbidden response for insufficient permissions

## 🧪 Testing Admin Access

### 1. Login as Admin

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "warungames@gmail.com",
    "password": "Boncell!23"
  }'
```

### 2. Access Admin Dashboard

```bash
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Test Non-Admin Access (Should Fail)

```bash
# Login as regular user first, then try admin endpoint
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer NON_ADMIN_JWT_TOKEN"

# Expected response: 403 Forbidden
{
  "success": false,
  "message": "Insufficient permissions"
}
```

## 📋 Implementation Checklist

- ✅ `requireAdmin` middleware implemented
- ✅ All `/api/admin/*` routes protected
- ✅ Authentication required before authorization
- ✅ Role validation (admin only)
- ✅ SQL script for manual admin creation
- ✅ Bcrypt password hashing
- ✅ Proper error responses (401/403)
- ✅ Router-level protection (cannot be bypassed)

## 🚀 Frontend Integration

### Dashboard Access Control

For the `/dashboard/admin` page, implement client-side route protection:

```javascript
// Example React route protection
const ProtectedAdminRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (user.role !== 'admin') {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};

// Usage
<Route path="/dashboard/admin" element={
  <ProtectedAdminRoute>
    <AdminDashboard />
  </ProtectedAdminRoute>
} />
```

### API Error Handling

```javascript
// Handle 403 responses in frontend
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      // Redirect to unauthorized page or show error
      window.location.href = '/unauthorized';
    }
    return Promise.reject(error);
  }
);
```

## 📝 Notes

- Admin users are created manually via SQL (no registration endpoint)
- All admin operations are logged and auditable
- Admin role cannot be changed via API (database-level change required)
- Multiple admin users can be created using the same SQL pattern
- Admin access is immediately revoked if user is deactivated