# Farmer Endpoints Documentation

## Overview
Endpoint khusus untuk petani (farmer) yang menyediakan data dashboard lengkap dan statistik.

## Authentication
Semua endpoint farmer memerlukan:
- Bearer token di header Authorization
- Role user harus "farmer" atau "admin"

## Endpoints

### 1. GET /api/farmer/dashboard

**Deskripsi:** Mengambil data dashboard lengkap untuk petani yang sedang login

**Authentication:** Required (Bearer Token)

**Authorization:** Role "farmer" atau "admin"

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "farmer": {
      "id": "uuid-farmer-id",
      "full_name": "Nama Lengkap Petani",
      "email": "farmer@example.com",
      "phone": "081234567890",
      "location": "Kota, Provinsi",
      "avatar_url": "https://example.com/avatar.jpg",
      "business_name": "Nama Usaha Tani",
      "role": "farmer",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    },
    "products": [
      {
        "id": "uuid-product-id",
        "name": "Nama Produk",
        "description": "Deskripsi produk",
        "price": 50000,
        "quantity": 100,
        "unit": "kg",
        "category": "sayuran",
        "harvest_date": "2024-01-15",
        "expiry_date": "2024-01-30",
        "image_url": "https://example.com/product.jpg",
        "status": "available",
        "created_at": "2024-01-01T00:00:00.000Z",
        "updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "orders": [
      {
        "id": "uuid-order-id",
        "product_id": "uuid-product-id",
        "product_name": "Nama Produk",
        "retailer_id": "uuid-retailer-id",
        "retailer_name": "Nama Retailer",
        "quantity": 10,
        "unit_price": 50000,
        "total_price": 500000,
        "status": "pending",
        "order_date": "2024-01-10T00:00:00.000Z",
        "delivery_date": "2024-01-15T00:00:00.000Z",
        "notes": "Catatan pesanan"
      }
    ],
    "transactions": [
      {
        "id": "uuid-transaction-id",
        "order_id": "uuid-order-id",
        "amount": 500000,
        "commission_amount": 25000,
        "net_amount": 475000,
        "status": "completed",
        "payment_method": "bank_transfer",
        "transaction_date": "2024-01-15T00:00:00.000Z",
        "reference_number": "TXN123456789"
      }
    ]
  }
}
```

**Error Responses:**

401 Unauthorized:
```json
{
  "success": false,
  "message": "Access token required"
}
```

403 Forbidden:
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

500 Internal Server Error:
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details"
}
```

### 2. GET /api/farmer/stats

**Deskripsi:** Mengambil statistik ringkas untuk dashboard petani

**Authentication:** Required (Bearer Token)

**Authorization:** Role "farmer" atau "admin"

**Request Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_products": 15,
      "active_products": 12,
      "total_orders": 45,
      "pending_orders": 8,
      "completed_orders": 32,
      "cancelled_orders": 5,
      "total_transactions": 32,
      "total_revenue": 15750000,
      "total_commission": 787500,
      "net_revenue": 14962500
    }
  }
}
```

## Data Handling

### NULL Values
- Semua field NULL dari database dikembalikan sebagai string kosong ("") atau nilai default
- Field numerik NULL dikembalikan sebagai 0
- Field boolean NULL dikembalikan sebagai false
- Field date NULL dikembalikan sebagai null

### Field Mapping
- `avatar_url`: Jika NULL → ""
- `business_name`: Jika NULL → ""
- `location`: Jika NULL → ""
- `phone`: Jika NULL → ""
- `description`: Jika NULL → ""
- `image_url`: Jika NULL → ""
- `notes`: Jika NULL → ""

## Security

1. **Authentication:** Semua endpoint memerlukan JWT token yang valid
2. **Authorization:** Hanya user dengan role "farmer" atau "admin" yang dapat mengakses
3. **Data Isolation:** Petani hanya dapat melihat data mereka sendiri
4. **Rate Limiting:** Endpoint tunduk pada rate limiting global (1000 requests per 15 menit)

## Usage Examples

### JavaScript/Fetch
```javascript
// Get farmer dashboard
const response = await fetch('/api/farmer/dashboard', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data.farmer); // Farmer info
console.log(data.data.products); // Products array
console.log(data.data.orders); // Orders array
console.log(data.data.transactions); // Transactions array
```

### cURL
```bash
# Get farmer dashboard
curl -X GET "http://localhost:3000/api/farmer/dashboard" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Get farmer stats
curl -X GET "http://localhost:3000/api/farmer/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Notes

1. Endpoint ini dirancang khusus untuk mendukung halaman dashboard farmer di frontend
2. Data dikembalikan dalam format yang konsisten dan terstruktur
3. Semua relasi antar tabel sudah di-join untuk mengurangi jumlah request dari frontend
4. Field NULL ditangani dengan baik untuk mencegah error di UI
5. Response time dioptimalkan dengan query yang efisien