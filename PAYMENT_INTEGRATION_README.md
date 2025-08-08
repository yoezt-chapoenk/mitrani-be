# Payment Integration Documentation

This document provides comprehensive API documentation for the payment gateway integration with Midtrans, Xendit, and Stripe.

## Overview

The payment system integrates with the existing orders table through a new transactions table, supporting multiple payment gateways and providing webhook handling for payment status updates.

## Database Schema

### Transactions Table

```sql
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric not null,
  payment_status varchar default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  commission numeric default 0,
  payment_gateway varchar check (payment_gateway in ('midtrans', 'xendit', 'stripe')),
  gateway_transaction_id varchar,
  gateway_payment_url text,
  gateway_token varchar,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

## API Endpoints

### Order Creation with Transaction

**POST** `/api/orders`

Creates a new order and automatically generates a transaction record.

**Request Body:**
```json
{
  "items": [
    {
      "product_id": "uuid",
      "quantity": 5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "order-uuid",
    "retailer_id": "user-uuid",
    "total_amount": 150.00,
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z",
    "transaction": {
      "id": "transaction-uuid",
      "amount": 150.00,
      "commission": 7.50,
      "payment_status": "pending"
    }
  }
}
```

### Payment Request

**POST** `/api/orders/:id/pay`

Generates a payment request with the specified gateway.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{
  "payment_gateway": "midtrans"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment request created successfully",
  "data": {
    "payment_url": "https://app.midtrans.com/snap/v1/transactions/...",
    "payment_token": "snap-token-123",
    "transaction_id": "transaction-uuid",
    "amount": 150.00,
    "expires_at": "2024-01-15T11:30:00Z"
  }
}
```

**Error Responses:**
```json
// Order not found or not owned by user
{
  "success": false,
  "message": "Order not found or you don't have permission to pay for this order"
}

// Order already paid or cancelled
{
  "success": false,
  "message": "Order cannot be paid. Current status: confirmed"
}

// Invalid payment gateway
{
  "success": false,
  "message": "Invalid payment gateway. Supported gateways: midtrans, xendit, stripe"
}
```

### Payment Status Check

**GET** `/api/payments/status/:transactionId`

Retrieve current payment status for a transaction.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "transaction-uuid",
    "payment_status": "paid",
    "amount": 150.00,
    "payment_gateway": "midtrans",
    "gateway_transaction_id": "midtrans-txn-123",
    "paid_at": "2024-01-15T10:45:00Z",
    "order": {
      "id": "order-uuid",
      "status": "confirmed"
    }
  }
}
```

### Webhook Endpoint

**POST** `/api/payments/webhook`

Handles payment gateway webhooks for status updates.

**Headers:**
- Gateway-specific signature headers (automatically validated)

**Midtrans Webhook Payload:**
```json
{
  "transaction_time": "2024-01-15 10:45:00",
  "transaction_status": "settlement",
  "transaction_id": "midtrans-txn-123",
  "status_message": "midtrans payment success",
  "status_code": "200",
  "signature_key": "signature...",
  "payment_type": "credit_card",
  "order_id": "transaction-uuid",
  "merchant_id": "merchant-123",
  "gross_amount": "150.00",
  "fraud_status": "accept",
  "currency": "IDR"
}
```

**Xendit Webhook Payload:**
```json
{
  "id": "xendit-txn-123",
  "external_id": "transaction-uuid",
  "user_id": "user-123",
  "status": "PAID",
  "merchant_name": "Mitrani",
  "amount": 150.00,
  "paid_amount": 150.00,
  "bank_code": "BCA",
  "paid_at": "2024-01-15T10:45:00.000Z",
  "payer_email": "user@example.com",
  "description": "Payment for order order-uuid",
  "adjusted_received_amount": 150.00,
  "fees_paid_amount": 0,
  "updated": "2024-01-15T10:45:00.000Z",
  "created": "2024-01-15T10:30:00.000Z",
  "currency": "IDR",
  "payment_channel": "BCA",
  "payment_method": "BANK_TRANSFER"
}
```

**Stripe Webhook Payload:**
```json
{
  "id": "evt_123",
  "object": "event",
  "api_version": "2020-08-27",
  "created": 1610708700,
  "data": {
    "object": {
      "id": "pi_123",
      "object": "payment_intent",
      "amount": 15000,
      "currency": "usd",
      "status": "succeeded",
      "metadata": {
        "transaction_id": "transaction-uuid"
      }
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_123",
    "idempotency_key": null
  },
  "type": "payment_intent.succeeded"
}
```

**Webhook Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

## Transaction Management APIs

### List Transactions

**GET** `/api/transactions`

List transactions with filtering and pagination.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Query Parameters:**
- `payment_status` (optional): Filter by payment status (pending, paid, failed)
- `payment_gateway` (optional): Filter by gateway (midtrans, xendit, stripe)
- `retailer_id` (optional, admin only): Filter by retailer
- `farmer_id` (optional, admin only): Filter by farmer
- `date_from` (optional): Start date filter (ISO 8601)
- `date_to` (optional): End date filter (ISO 8601)
- `limit` (optional): Number of results (default: 10, max: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "transaction-uuid",
      "amount": 150.00,
      "commission": 7.50,
      "payment_status": "paid",
      "payment_gateway": "midtrans",
      "gateway_transaction_id": "midtrans-txn-123",
      "paid_at": "2024-01-15T10:45:00Z",
      "created_at": "2024-01-15T10:30:00Z",
      "orders": {
        "id": "order-uuid",
        "status": "confirmed",
        "retailer_id": "user-uuid",
        "users": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "order_items": [
          {
            "quantity": 5,
            "price": 30.00,
            "products": {
              "name": "Fresh Tomatoes",
              "farmer_id": "farmer-uuid",
              "users": {
                "name": "Jane Farm",
                "email": "jane@farm.com"
              }
            }
          }
        ]
      }
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "has_more": true
  }
}
```

### Transaction Statistics

**GET** `/api/transactions/stats`

Get transaction statistics (admin only).

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Query Parameters:**
- `date_from` (optional): Start date filter
- `date_to` (optional): End date filter

**Response:**
```json
{
  "success": true,
  "data": {
    "total_transactions": 150,
    "total_amount": 45000.00,
    "total_commission": 2250.00,
    "paid_transactions": 120,
    "paid_amount": 36000.00,
    "pending_transactions": 25,
    "pending_amount": 7500.00,
    "failed_transactions": 5,
    "failed_amount": 1500.00,
    "gateway_breakdown": {
      "midtrans": {
        "count": 80,
        "amount": 24000.00
      },
      "xendit": {
        "count": 45,
        "amount": 13500.00
      },
      "stripe": {
        "count": 25,
        "amount": 7500.00
      }
    }
  }
}
```

### Get Transaction Details

**GET** `/api/transactions/:id`

Get detailed information about a specific transaction.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transaction-uuid",
    "amount": 150.00,
    "commission": 7.50,
    "payment_status": "paid",
    "payment_gateway": "midtrans",
    "gateway_transaction_id": "midtrans-txn-123",
    "gateway_payment_url": "https://app.midtrans.com/snap/v1/transactions/...",
    "gateway_token": "snap-token-123",
    "paid_at": "2024-01-15T10:45:00Z",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:45:00Z",
    "orders": {
      "id": "order-uuid",
      "status": "confirmed",
      "retailer_id": "user-uuid",
      "total_amount": 150.00,
      "created_at": "2024-01-15T10:30:00Z",
      "users": {
        "name": "John Doe",
        "email": "john@example.com",
        "role": "retailer"
      },
      "order_items": [
        {
          "id": "item-uuid",
          "quantity": 5,
          "price": 30.00,
          "products": {
            "id": "product-uuid",
            "name": "Fresh Tomatoes",
            "description": "Organic tomatoes",
            "price": 30.00,
            "farmer_id": "farmer-uuid",
            "users": {
              "name": "Jane Farm",
              "email": "jane@farm.com",
              "role": "farmer"
            }
          }
        }
      ]
    }
  }
}
```

### Update Transaction Status (Admin)

**PATCH** `/api/transactions/:id/status`

Manually update transaction status (admin only).

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Request Body:**
```json
{
  "payment_status": "paid",
  "gateway_transaction_id": "manual-txn-123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction status updated successfully",
  "data": {
    "id": "transaction-uuid",
    "payment_status": "paid",
    "gateway_transaction_id": "manual-txn-123",
    "paid_at": "2024-01-15T11:00:00Z",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

### Get Transaction by Order ID

**GET** `/api/transactions/order/:orderId`

Get transaction details for a specific order.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transaction-uuid",
    "order_id": "order-uuid",
    "amount": 150.00,
    "payment_status": "paid",
    "payment_gateway": "midtrans",
    "paid_at": "2024-01-15T10:45:00Z"
  }
}
```

## Security Considerations

### Authentication
- All endpoints require JWT authentication via `Authorization: Bearer <token>` header
- Role-based access control:
  - **Retailers**: Can create orders, pay for their orders, view their transactions
  - **Farmers**: Can view transactions for orders containing their products
  - **Admins**: Full access to all transactions and management functions

### Webhook Security
- All webhook requests are validated using gateway-specific signature verification
- Midtrans: Uses `signature_key` validation
- Xendit: Uses `X-CALLBACK-TOKEN` header validation
- Stripe: Uses `Stripe-Signature` header validation

### Data Protection
- Sensitive payment data is not stored in our database
- Only gateway transaction IDs and payment URLs are stored
- All API responses exclude sensitive information

## Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Access token is required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "You don't have permission to access this resource"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Transaction not found"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Invalid payment gateway. Supported gateways: midtrans, xendit, stripe"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "An unexpected error occurred"
}
```

## Environment Variables

Required environment variables for payment gateway integration:

```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_IS_PRODUCTION=false

# Xendit Configuration
XENDIT_SECRET_KEY=your_xendit_secret_key
XENDIT_WEBHOOK_TOKEN=your_xendit_webhook_token

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Platform Configuration
PLATFORM_COMMISSION_RATE=0.05
FRONTEND_URL=http://localhost:3000
```

## Testing

### Running Tests
```bash
npm test -- tests/transactions.test.js
npm test -- tests/payments.test.js
```

### Test Coverage
- Transaction creation and management
- Payment gateway integration
- Webhook handling
- Role-based access control
- Error scenarios

## Integration Examples

### Frontend Payment Flow

1. **Create Order:**
```javascript
const response = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    items: [{ product_id: 'uuid', quantity: 5 }]
  })
});
const order = await response.json();
```

2. **Initiate Payment:**
```javascript
const paymentResponse = await fetch(`/api/orders/${order.data.id}/pay`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    payment_gateway: 'midtrans'
  })
});
const payment = await paymentResponse.json();

// Redirect to payment URL or use payment token
window.location.href = payment.data.payment_url;
```

3. **Check Payment Status:**
```javascript
const statusResponse = await fetch(`/api/payments/status/${transactionId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const status = await statusResponse.json();
```

## Troubleshooting

### Common Issues

1. **Payment URL not generated:**
   - Check gateway credentials in environment variables
   - Verify order status is 'pending'
   - Ensure user owns the order

2. **Webhook not processing:**
   - Verify webhook URL is accessible
   - Check signature validation
   - Review gateway webhook configuration

3. **Transaction status not updating:**
   - Check webhook endpoint logs
   - Verify gateway transaction ID mapping
   - Review database constraints

### Logging

All payment operations are logged with appropriate detail levels:
- Payment requests and responses
- Webhook processing
- Transaction status changes
- Error conditions

## Future Enhancements

- Support for additional payment gateways
- Recurring payment support
- Payment installments
- Refund processing
- Advanced fraud detection
- Payment analytics dashboard