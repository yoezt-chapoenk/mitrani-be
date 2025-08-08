# Orders Feature Implementation

This document describes the implementation of the Orders feature for the Mitrani Backend API.

## Overview

The Orders feature enables retailers to create orders for products from farmers, with a complete order lifecycle management system including status transitions, role-based permissions, and stock management.

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  delivery_address TEXT NOT NULL,
  notes TEXT,
  ordered_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'delivered', 'completed', 'cancelled');
```

### Order Items Table
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### 1. POST /api/orders
**Description:** Create a new order (retailer only)
**Access:** Private (Retailer role required)

#### Request Body:
```json
{
  "product_id": "uuid",
  "quantity": 5,
  "delivery_address": "123 Main Street, City, State",
  "notes": "Optional delivery notes"
}
```

#### Response:
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "order-uuid",
    "retailer_id": "retailer-uuid",
    "total_amount": 52.50,
    "status": "pending",
    "delivery_address": "123 Main Street, City, State",
    "notes": "Optional delivery notes",
    "ordered_at": "2024-01-01T10:00:00Z",
    "order_items": [...],
    "users": {...}
  }
}
```

### 2. GET /api/orders
**Description:** List orders with filters and pagination
**Access:** Private (Role-based filtering)

#### Query Parameters:
- `retailer_id` (optional): Filter by retailer ID
- `farmer_id` (optional): Filter by farmer ID (via product join)
- `status` (optional): Filter by order status
- `limit` (optional): Number of items per page (max 50, default 10)
- `offset` (optional): Number of items to skip (default 0)

#### Response:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 25
  }
}
```

### 3. GET /api/orders/:id
**Description:** Get order details by ID
**Access:** Private (Order owner or farmer with products in order)

#### Response:
```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "retailer_id": "retailer-uuid",
    "total_amount": 52.50,
    "status": "pending",
    "delivery_address": "123 Main Street",
    "notes": "Delivery notes",
    "ordered_at": "2024-01-01T10:00:00Z",
    "confirmed_at": null,
    "delivered_at": null,
    "completed_at": null,
    "users": {
      "id": "retailer-uuid",
      "full_name": "Retailer Name",
      "email": "retailer@example.com",
      "phone": "+1234567890"
    },
    "order_items": [
      {
        "id": "item-uuid",
        "quantity": 5,
        "unit_price": 10.50,
        "total_price": 52.50,
        "products": {
          "id": "product-uuid",
          "name": "Product Name",
          "price": 10.50,
          "unit": "kg",
          "farmer_id": "farmer-uuid",
          "status": "available",
          "users": {
            "id": "farmer-uuid",
            "full_name": "Farmer Name",
            "email": "farmer@example.com",
            "phone": "+1234567890"
          }
        }
      }
    ]
  }
}
```

### 4. PATCH /api/orders/:id/status
**Description:** Update order status
**Access:** Private (Role-based permissions)

#### Request Body:
```json
{
  "status": "confirmed"
}
```

#### Response:
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {...}
}
```

### 5. PATCH /api/orders/:id
**Description:** Update order quantity (pending orders only, retailer only)
**Access:** Private (Retailer only, pending orders only)

#### Request Body:
```json
{
  "quantity": 8
}
```

#### Response:
```json
{
  "success": true,
  "message": "Order quantity updated successfully",
  "data": {...}
}
```

## Business Rules

### Order Creation
1. **Product Validation**: Product must exist and have status 'available'
2. **Quantity Validation**: Quantity must be > 0 and ≤ available stock
3. **Price Calculation**: Total price = product.price × quantity (server-side calculation)
4. **Initial Status**: Orders start with status 'pending'
5. **Timestamp**: `ordered_at` is set to current timestamp
6. **Stock Reservation**: Product quantity is decremented and status may change to 'ordered'

### Status Transitions
The order status follows a strict state machine:

```
pending → confirmed → delivered → completed
   ↓           ↓
cancelled   cancelled (admin only)
```

#### Valid Transitions:
- **pending → confirmed**: By farmer or admin, sets `confirmed_at`
- **confirmed → delivered**: By farmer or admin, sets `delivered_at`
- **delivered → completed**: By retailer or admin, sets `completed_at`
- **pending → cancelled**: By retailer or admin
- **confirmed → cancelled**: By admin only

### Role-Based Permissions

#### Retailer:
- Create orders
- View their own orders
- Cancel pending orders
- Mark delivered orders as completed
- Update quantity of pending orders

#### Farmer:
- View orders containing their products
- Confirm pending orders for their products
- Mark confirmed orders as delivered

#### Admin:
- All operations
- Cancel confirmed orders

### Stock Management

#### On Order Creation:
- Product quantity is decremented by order quantity
- If product quantity reaches 0, status changes to 'ordered'
- Stock is "reserved" but not permanently allocated

#### On Order Confirmation:
- Stock reservation is confirmed
- If product quantity is 0, status changes to 'sold'

#### On Order Cancellation:
- Product quantity is restored
- Product status changes back to 'available'

## Error Handling

### Common Error Responses:

#### 400 Bad Request:
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "quantity",
      "message": "Quantity must be a positive integer"
    }
  ]
}
```

#### 403 Forbidden:
```json
{
  "success": false,
  "message": "Only retailers can create orders"
}
```

#### 404 Not Found:
```json
{
  "success": false,
  "message": "Order not found"
}
```

## Security Considerations

1. **JWT Authentication**: All endpoints require valid JWT token
2. **Role-Based Access**: Permissions enforced based on user role
3. **Data Validation**: Input validation using express-validator
4. **SQL Injection Prevention**: Parameterized queries via Supabase client
5. **Price Integrity**: Server-side price calculation prevents tampering

## Performance Optimizations

1. **Pagination**: Default limit of 10, maximum of 50 items per page
2. **Efficient Queries**: Single queries with joins for related data
3. **Indexes**: Database indexes on frequently queried fields
4. **Transaction-like Operations**: Rollback on failures during order creation

## Testing

The implementation includes comprehensive unit tests covering:

- Order creation (happy path and error cases)
- Order listing with filters and pagination
- Order detail retrieval with permission checks
- Status updates with business rule validation
- Quantity updates with constraints
- Authentication and authorization

### Running Tests:
```bash
npm test tests/orders.test.js
```

## File Structure

```
├── database/
│   └── schema.sql              # Database schema with orders tables
├── routes/
│   └── orders.js              # Order API routes
├── services/
│   └── orderService.js        # Order business logic
├── middlewares/
│   └── validation.js          # Order validation rules
├── tests/
│   └── orders.test.js         # Order unit tests
└── ORDERS_FEATURE_README.md   # This documentation
```

## Usage Examples

### Create an Order:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer <retailer-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "product-uuid",
    "quantity": 5,
    "delivery_address": "123 Main Street, City",
    "notes": "Please deliver in the morning"
  }'
```

### List Orders:
```bash
curl -X GET "http://localhost:3000/api/orders?status=pending&limit=20" \
  -H "Authorization: Bearer <jwt-token>"
```

### Update Order Status:
```bash
curl -X PATCH http://localhost:3000/api/orders/order-uuid/status \
  -H "Authorization: Bearer <farmer-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```

### Update Order Quantity:
```bash
curl -X PATCH http://localhost:3000/api/orders/order-uuid \
  -H "Authorization: Bearer <retailer-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 8}'
```

## Future Enhancements

1. **Bulk Orders**: Support for multiple products in a single order
2. **Order History**: Track all status changes with timestamps
3. **Notifications**: Real-time notifications for status updates
4. **Payment Integration**: Payment processing and tracking
5. **Delivery Tracking**: Integration with logistics providers
6. **Order Analytics**: Reporting and analytics dashboard

## Troubleshooting

### Common Issues:

1. **"Product not found"**: Ensure product_id exists and is valid UUID
2. **"Insufficient stock"**: Check product quantity before ordering
3. **"Invalid status transition"**: Review status transition rules
4. **"Permission denied"**: Verify user role and ownership
5. **"Validation failed"**: Check request body format and required fields

### Debug Mode:
Enable detailed logging by setting `NODE_ENV=development` in environment variables.