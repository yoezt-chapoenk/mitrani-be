# Admin API Endpoints Documentation

This document provides comprehensive documentation for all admin-related API endpoints that pull real data from the Supabase/PostgreSQL database.

## 🔐 Authentication & Authorization

All admin endpoints require:
1. **Authentication**: Valid JWT token in Authorization header
2. **Authorization**: User must have `role = 'admin'`

```bash
Authorization: Bearer <your-jwt-token>
```

## 📊 Dashboard Statistics

### GET `/api/admin/dashboard`
Get comprehensive dashboard statistics including users, orders, products, and monthly trends.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "stats": {
      "users": {
        "total": 150,
        "farmers": 80,
        "retailers": 65,
        "admins": 5,
        "verified": 120,
        "active": 140,
        "new_this_month": 15
      },
      "orders": {
        "total": 500,
        "pending": 25,
        "confirmed": 50,
        "processing": 30,
        "shipped": 40,
        "delivered": 300,
        "cancelled": 55,
        "total_revenue": 2500000,
        "this_month_revenue": 450000
      },
      "products": {
        "total": 200,
        "active": 180,
        "inactive": 20,
        "categories": 8,
        "new_this_month": 25
      },
      "monthly_trends": [
        {
          "month": "2024-08",
          "users": 15,
          "orders": 45,
          "products": 25,
          "revenue": 450000
        }
      ]
    }
  }
}
```

## 👥 User Management

### GET `/api/admin/users`
Retrieve all users with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `role` (string): Filter by role (`farmer`, `retailer`, `admin`)
- `is_verified` (boolean): Filter by verification status
- `is_active` (boolean): Filter by active status
- `search` (string): Search in name, email, or phone
- `sort_by` (string): Sort field (default: `created_at`)
- `sort_order` (string): Sort order (`asc`, `desc`, default: `desc`)

**Example:**
```bash
GET /api/admin/users?role=farmer&page=1&limit=10&is_verified=true
```

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "farmer@example.com",
        "full_name": "John Farmer",
        "role": "farmer",
        "phone": "+6281234567890",
        "address": "Farm Address",
        "is_verified": true,
        "is_active": true,
        "created_at": "2024-08-01T10:00:00Z",
        "updated_at": "2024-08-01T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 50,
      "items_per_page": 10,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### GET `/api/admin/users/:id`
Get specific user details by ID.

### PATCH `/api/admin/users/:id/verify`
Verify a user account.

### PATCH `/api/admin/users/:id/activate`
Activate a user account.

### PATCH `/api/admin/users/:id/deactivate`
Deactivate a user account.

### DELETE `/api/admin/users/:id`
Permanently delete a user (only if no orders/products exist).

### GET `/api/admin/users/stats`
Get user statistics by role and status.

**Response:**
```json
{
  "success": true,
  "message": "User statistics retrieved successfully",
  "data": {
    "stats": {
      "total": 150,
      "by_role": {
        "farmer": 80,
        "retailer": 65,
        "admin": 5
      },
      "by_status": {
        "verified": 120,
        "unverified": 30,
        "active": 140,
        "inactive": 10
      },
      "recent": {
        "last_7_days": 8,
        "last_30_days": 25
      }
    }
  }
}
```

## 🥕 Product Management

### GET `/api/admin/products`
Retrieve all products with farmer information, filtering, and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by status (`available`, `ordered`, `sold`)
- `farmer_id` (uuid): Filter by specific farmer
- `search` (string): Search in product name
- `sort_by` (string): Sort field (default: `created_at`)
- `sort_order` (string): Sort order (`asc`, `desc`, default: `desc`)

**Example:**
```bash
GET /api/admin/products?status=available&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Organic Tomatoes",
        "quantity": 100,
        "unit": "kg",
        "price": 15000,
        "harvest_date": "2024-08-01",
        "image_url": "https://example.com/tomato.jpg",
        "status": "available",
        "created_at": "2024-08-01T10:00:00Z",
        "updated_at": "2024-08-01T10:00:00Z",
        "farmer": {
          "id": "uuid",
          "full_name": "John Farmer",
          "email": "farmer@example.com",
          "phone": "+6281234567890"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 25,
      "items_per_page": 10,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

## 📦 Order Management

### GET `/api/admin/orders`
Retrieve all orders with retailer, farmer, and product details.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by order status
- `start_date` (string): Filter orders from date (YYYY-MM-DD)
- `end_date` (string): Filter orders to date (YYYY-MM-DD)
- `retailer_id` (uuid): Filter by specific retailer
- `farmer_id` (uuid): Filter by specific farmer
- `sort_by` (string): Sort field (default: `created_at`)
- `sort_order` (string): Sort order (`asc`, `desc`, default: `desc`)

**Example:**
```bash
GET /api/admin/orders?status=pending&start_date=2024-08-01&end_date=2024-08-31
```

**Response:**
```json
{
  "success": true,
  "message": "Orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": "uuid",
        "quantity": 50,
        "total_price": 750000,
        "status": "pending",
        "ordered_at": "2024-08-01T10:00:00Z",
        "created_at": "2024-08-01T10:00:00Z",
        "updated_at": "2024-08-01T10:00:00Z",
        "retailer": {
          "id": "uuid",
          "full_name": "Jane Retailer",
          "email": "retailer@example.com",
          "phone": "+6281234567891",
          "business_name": "Jane's Store"
        },
        "product": {
          "id": "uuid",
          "name": "Organic Tomatoes",
          "unit": "kg",
          "price": 15000,
          "farmer": {
            "id": "uuid",
            "full_name": "John Farmer",
            "email": "farmer@example.com",
            "phone": "+6281234567890"
          }
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_items": 15,
      "items_per_page": 10,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

## 💰 Transaction Management

### GET `/api/admin/transactions`
Retrieve all transactions with full payment history and revenue statistics.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `start_date` (string): Filter transactions from date (YYYY-MM-DD)
- `end_date` (string): Filter transactions to date (YYYY-MM-DD)
- `payment_status` (string): Filter by payment status (`pending`, `completed`, `failed`)
- `sort_by` (string): Sort field (default: `created_at`)
- `sort_order` (string): Sort order (`asc`, `desc`, default: `desc`)

**Example:**
```bash
GET /api/admin/transactions?payment_status=completed&start_date=2024-08-01
```

**Response:**
```json
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "amount": 750000,
        "payment_status": "completed",
        "commission": 75000,
        "paid_at": "2024-08-01T12:00:00Z",
        "created_at": "2024-08-01T10:00:00Z",
        "order": {
          "id": "uuid",
          "quantity": 50,
          "total_price": 750000,
          "status": "delivered",
          "retailer": {
            "id": "uuid",
            "full_name": "Jane Retailer",
            "email": "retailer@example.com",
            "business_name": "Jane's Store"
          },
          "product": {
            "id": "uuid",
            "name": "Organic Tomatoes",
            "farmer": {
              "id": "uuid",
              "full_name": "John Farmer",
              "email": "farmer@example.com"
            }
          }
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 45,
      "items_per_page": 10,
      "has_next": true,
      "has_prev": false
    },
    "statistics": {
      "total_revenue": 2500000,
      "total_commission": 250000,
      "breakdown_by_date": [
        {
          "date": "2024-08-01",
          "revenue": 750000,
          "commission": 75000,
          "transaction_count": 5
        }
      ]
    }
  }
}
```

## 🔧 System Management

### GET `/api/admin/system/health`
Get system health status and metrics.

### POST `/api/admin/notifications/cleanup`
Clean up old notifications.

## 🛡️ Security Features

1. **JWT Authentication**: All endpoints require valid JWT token
2. **Role-based Authorization**: Only admin users can access these endpoints
3. **Input Validation**: All query parameters are validated
4. **SQL Injection Protection**: Using Supabase client with parameterized queries
5. **Rate Limiting**: Implemented at application level

## 📝 Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Admin access required"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid query parameters",
  "errors": [
    {
      "field": "page",
      "message": "Page must be a positive integer"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch data: Database connection error"
}
```

## 🧪 Testing

Use the provided test script to verify all endpoints:

```bash
node test-admin-endpoints.js
```

**Note**: Update the `ADMIN_TOKEN` variable in the test script with a valid JWT token from an admin user.

## 📊 Database Schema Reference

### Users Table
- `id` (UUID): Primary key
- `email` (VARCHAR): Unique email address
- `full_name` (VARCHAR): User's full name
- `role` (VARCHAR): `farmer`, `retailer`, or `admin`
- `phone` (VARCHAR): Phone number
- `address` (TEXT): User address
- `business_name` (VARCHAR): Business name (for retailers)
- `is_verified` (BOOLEAN): Verification status
- `is_active` (BOOLEAN): Active status
- `created_at`, `updated_at` (TIMESTAMP): Timestamps

### Products Table
- `id` (UUID): Primary key
- `farmer_id` (UUID): Foreign key to users table
- `name` (VARCHAR): Product name
- `quantity` (NUMERIC): Available quantity
- `unit` (VARCHAR): Unit of measurement
- `price` (NUMERIC): Price per unit
- `harvest_date` (DATE): Harvest date
- `status` (VARCHAR): `available`, `ordered`, `sold`
- `created_at`, `updated_at` (TIMESTAMP): Timestamps

### Orders Table
- `id` (UUID): Primary key
- `product_id` (UUID): Foreign key to products table
- `retailer_id` (UUID): Foreign key to users table
- `quantity` (NUMERIC): Ordered quantity
- `total_price` (NUMERIC): Total order price
- `status` (VARCHAR): Order status
- `ordered_at` (TIMESTAMP): Order timestamp
- `created_at`, `updated_at` (TIMESTAMP): Timestamps

### Transactions Table
- `id` (UUID): Primary key
- `order_id` (UUID): Foreign key to orders table
- `amount` (NUMERIC): Transaction amount
- `payment_status` (VARCHAR): Payment status
- `commission` (NUMERIC): Platform commission
- `paid_at` (TIMESTAMP): Payment timestamp
- `created_at` (TIMESTAMP): Creation timestamp

## 🚀 Deployment Notes

1. Ensure all environment variables are properly set
2. Database migrations should be run before deployment
3. Admin user should be created using the provided SQL script
4. Test all endpoints after deployment
5. Monitor logs for any database connection issues

---

**Last Updated**: August 2024  
**Version**: 1.0.0