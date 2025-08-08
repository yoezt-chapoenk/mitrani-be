# Simplified Farm-to-Market Platform - Backend

A complete Node.js backend for a MicroSaaS Farm-to-Market platform that connects farmers directly with retailers. Built with Express.js, Supabase (PostgreSQL), and following modern backend development practices.

## 🚀 Features

### Core Functionality
- **User Management**: Registration, authentication, and role-based access control
- **WhatsApp OTP Registration**: Secure user registration with WhatsApp OTP verification
- **Product Management**: CRUD operations for farm products with image uploads
- **Order System**: Complete order lifecycle from placement to delivery
- **Admin Dashboard**: User management, transaction monitoring, and system analytics
- **File Uploads**: Supabase Storage integration for product images and user avatars
- **Notifications**: Real-time notification system for order updates and alerts

### User Roles
- **Farmers**: Manage products, view orders, update order status
- **Retailers**: Browse products, place orders, track deliveries
- **Admins**: System management, user verification, analytics

### Technical Features
- JWT-based authentication
- Role-based authorization
- Input validation and sanitization
- Error handling and logging
- Rate limiting and security headers
- File upload with validation
- Database transactions
- Pagination and filtering
- API documentation

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project
- Git

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd mitrani-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment file and configure your settings:
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=5242880
```

### 4. Database Setup

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database/schema.sql`
4. Execute the SQL commands

#### Option B: Using Supabase CLI (if installed)
```bash
supabase db reset
```

### 5. Seed the Database (Optional)
Populate the database with sample data for development:
```bash
npm run seed
```

To clear existing data and reseed:
```bash
npm run seed -- --clear
```

### 6. Start the Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## 📁 Project Structure

```
mitrani-backend/
├── config/
│   └── supabase.js          # Supabase client configuration
├── database/
│   └── schema.sql           # Database schema and setup
├── middlewares/
│   ├── auth.js              # Authentication & authorization
│   ├── errorHandler.js      # Global error handling
│   └── validation.js        # Input validation rules
├── routes/
│   ├── admin.js             # Admin management routes
│   ├── auth.js              # Authentication routes
│   ├── notifications.js     # Notification routes
│   ├── orders.js            # Order management routes
│   ├── products.js          # Product management routes
│   ├── upload.js            # File upload routes
│   └── users.js             # User profile routes
├── scripts/
│   └── seed.js              # Database seeding script
├── services/
│   ├── adminService.js      # Admin business logic
│   ├── authService.js       # Authentication logic
│   ├── notificationService.js # Notification management
│   ├── orderService.js      # Order processing logic
│   ├── productService.js    # Product management logic
│   └── uploadService.js     # File upload logic
├── .env.example             # Environment variables template
├── package.json             # Dependencies and scripts
├── server.js                # Application entry point
└── README.md                # This file
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/verify-token` - Verify JWT token
- `POST /api/auth/refresh-token` - Refresh JWT token

### WhatsApp OTP Authentication
- `POST /api/auth-otp/register` - Start registration with WhatsApp OTP
- `POST /api/auth-otp/verify` - Verify OTP and complete registration
- `POST /api/auth-otp/resend` - Resend OTP
- `GET /api/auth-otp/cleanup` - Clean up expired OTP records

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/:id` - Get user public profile

### Products
- `GET /api/products` - List all products (public)
- `GET /api/products/search` - Search products
- `GET /api/products/categories` - Get product categories
- `POST /api/products` - Create product (farmer only)
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product (farmer only)
- `DELETE /api/products/:id` - Delete product (farmer only)
- `PATCH /api/products/:id/stock` - Update stock quantity
- `GET /api/products/farmer/me` - Get current farmer's products
- `GET /api/products/farmer/:farmerId` - Get products by farmer

### Orders
- `GET /api/orders` - List orders (role-based filtering)
- `GET /api/orders/stats` - Get order statistics
- `POST /api/orders` - Create new order (retailer only)
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id/status` - Update order status
- `PATCH /api/orders/:id/cancel` - Cancel order
- `GET /api/orders/retailer/me` - Get current retailer's orders
- `GET /api/orders/farmer/me` - Get orders for current farmer's products

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `PATCH /api/admin/users/:id/verify` - Verify user
- `PATCH /api/admin/users/:id/toggle-status` - Activate/deactivate user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/transactions` - List all transactions
- `GET /api/admin/user-stats` - User statistics
- `DELETE /api/admin/notifications/cleanup` - Clean old notifications
- `GET /api/admin/health` - System health check

### File Uploads
- `POST /api/upload/product-image` - Upload product image
- `POST /api/upload/avatar` - Upload user avatar
- `POST /api/upload/multiple-images` - Upload multiple images
- `DELETE /api/upload/file` - Delete file
- `GET /api/upload/files` - List files
- `GET /api/upload/file-info` - Get file information

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/unread` - Get unread notifications
- `GET /api/notifications/by-type/:type` - Get notifications by type

## 🔒 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Test Credentials (after seeding)
- **Admin**: `admin@farmmarket.com` / `admin123`
- **Farmer**: `farmer1@example.com` / `farmer123`
- **Retailer**: `retailer1@example.com` / `retailer123`

## 📝 API Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Validation errors (if any)
  ]
}
```

## 🚀 Deployment

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Set environment variables in Vercel dashboard or via CLI:
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
# ... add other environment variables
```

### Render Deployment

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the build command: `npm install`
4. Set the start command: `npm start`
5. Add environment variables in the Render dashboard

### Railway Deployment

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

3. Set environment variables:
```bash
railway variables set SUPABASE_URL=your_value
# ... set other variables
```

## 🧪 Testing

### Manual Testing
Use tools like Postman, Insomnia, or curl to test the API endpoints.

### Health Check
Verify the server is running:
```bash
curl http://localhost:3000/health
```

## 🔧 Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data
- `npm run seed -- --clear` - Clear and reseed database

### Environment Variables
See `.env.example` for all required environment variables.

### Database Migrations
When making schema changes:
1. Update `database/schema.sql`
2. Apply changes to your Supabase database
3. Update seed script if necessary

## 🛡️ Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing protection
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Sanitizes and validates all inputs
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt for password security
- **File Upload Validation**: Type and size restrictions
- **SQL Injection Protection**: Parameterized queries via Supabase

## 📊 Monitoring

- Health check endpoint: `/health`
- Error logging with detailed stack traces
- Request logging with Morgan
- Admin dashboard for system monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the API documentation above
- Review the error messages in the response
- Check the server logs for detailed error information
- Ensure all environment variables are properly set

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
  - User authentication and authorization
  - Product and order management
  - File upload capabilities
  - Admin dashboard
  - Notification system

---

**Built with ❤️ for connecting farmers and retailers**