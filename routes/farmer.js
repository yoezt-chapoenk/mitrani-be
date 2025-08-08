const express = require('express');
const farmerService = require('../services/farmerService');
const { authenticateToken, requireFarmer } = require('../middlewares/auth');

const router = express.Router();

/**
 * @route   GET /api/farmer/dashboard
 * @desc    Get comprehensive farmer dashboard data
 * @access  Private (Farmer only)
 * @returns {Object} Complete farmer dashboard with products, orders, and transactions
 * 
 * @example
 * GET /api/farmer/dashboard
 * Authorization: Bearer <jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Farmer dashboard data retrieved successfully",
 *   "data": {
 *     "farmer": {
 *       "id": "uuid",
 *       "full_name": "John Farmer",
 *       "email": "farmer@example.com",
 *       "phone": "+6281234567890",
 *       "address": "Farm Address",
 *       "avatar_url": "https://example.com/avatar.jpg",
 *       "business_name": "John's Farm",
 *       "is_verified": true,
 *       "is_active": true,
 *       "created_at": "2024-01-01T00:00:00.000Z",
 *       "products": [
 *         {
 *           "id": "uuid",
 *           "name": "Organic Tomatoes",
 *           "quantity": 100,
 *           "unit": "kg",
 *           "price": 15000,
 *           "harvest_date": "2024-08-01",
 *           "image_url": "https://example.com/tomato.jpg",
 *           "status": "available",
 *           "created_at": "2024-08-01T10:00:00Z",
 *           "updated_at": "2024-08-01T10:00:00Z"
 *         }
 *       ],
 *       "orders": [
 *         {
 *           "id": "uuid",
 *           "order_item_id": "uuid",
 *           "product_id": "uuid",
 *           "product_name": "Organic Tomatoes",
 *           "quantity": 10,
 *           "unit": "kg",
 *           "unit_price": 15000,
 *           "total_price": 150000,
 *           "status": "confirmed",
 *           "delivery_address": "Retailer Address",
 *           "notes": "Handle with care",
 *           "ordered_at": "2024-08-01T10:00:00Z",
 *           "confirmed_at": "2024-08-01T11:00:00Z",
 *           "delivered_at": "",
 *           "completed_at": "",
 *           "created_at": "2024-08-01T10:00:00Z",
 *           "updated_at": "2024-08-01T11:00:00Z",
 *           "retailer": {
 *             "id": "uuid",
 *             "full_name": "Jane Retailer",
 *             "email": "retailer@example.com",
 *             "phone": "+6281234567891",
 *             "business_name": "Jane's Store"
 *           }
 *         }
 *       ],
 *       "transactions": [
 *         {
 *           "id": "uuid",
 *           "order_id": "uuid",
 *           "amount": 150000,
 *           "payment_status": "paid",
 *           "commission": 7500,
 *           "payment_gateway": "midtrans",
 *           "paid_at": "2024-08-01T12:00:00Z",
 *           "created_at": "2024-08-01T10:00:00Z",
 *           "updated_at": "2024-08-01T12:00:00Z"
 *         }
 *       ]
 *     }
 *   }
 * }
 */
router.get('/dashboard', authenticateToken, requireFarmer, async (req, res, next) => {
  try {
    const farmerId = req.user.id;
    const dashboardData = await farmerService.getFarmerDashboard(farmerId);

    res.json({
      success: true,
      message: 'Farmer dashboard data retrieved successfully',
      data: dashboardData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/farmer/stats
 * @desc    Get farmer dashboard statistics
 * @access  Private (Farmer only)
 * @returns {Object} Dashboard statistics summary
 * 
 * @example
 * GET /api/farmer/stats
 * Authorization: Bearer <jwt-token>
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Farmer statistics retrieved successfully",
 *   "data": {
 *     "stats": {
 *       "products": {
 *         "total": 25,
 *         "available": 20,
 *         "ordered": 3,
 *         "sold": 2
 *       },
 *       "orders": {
 *         "total": 50,
 *         "pending": 5,
 *         "confirmed": 10,
 *         "delivered": 15,
 *         "completed": 18,
 *         "cancelled": 2,
 *         "total_revenue": 2500000
 *       },
 *       "transactions": {
 *         "total": 45,
 *         "paid": 40,
 *         "pending": 3,
 *         "failed": 2,
 *         "total_commission": 125000
 *       }
 *     }
 *   }
 * }
 */
router.get('/stats', authenticateToken, requireFarmer, async (req, res, next) => {
  try {
    const farmerId = req.user.id;
    const stats = await farmerService.getFarmerStats(farmerId);

    res.json({
      success: true,
      message: 'Farmer statistics retrieved successfully',
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;