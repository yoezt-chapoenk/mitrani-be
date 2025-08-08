const express = require('express');
const productService = require('../services/productservice');
const { 
  authenticateToken, 
  requireFarmer, 
  requireFarmerOrRetailer 
} = require('../middlewares/auth');
const { 
  validateProductCreation, 
  validateProductUpdate, 
  validatePagination, 
  validateUUIDParam 
} = require('../middlewares/validation');
const { query } = require('express-validator');

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    Get all products with filtering and pagination
 * @access  Public
 */
router.get('/', validatePagination, async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      search: req.query.search,
      farmer_id: req.query.farmer_id,
      min_price: req.query.min_price ? parseFloat(req.query.min_price) : undefined,
      max_price: req.query.max_price ? parseFloat(req.query.max_price) : undefined,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc'
    };

    const result = await productService.getProducts(options);

    res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/products/search
 * @desc    Search products
 * @access  Public
 */
router.get('/search', [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  validatePagination
], async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      category: req.query.category,
      farmer_id: req.query.farmer_id,
      min_price: req.query.min_price ? parseFloat(req.query.min_price) : undefined,
      max_price: req.query.max_price ? parseFloat(req.query.max_price) : undefined,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc'
    };

    const result = await productService.searchProducts(req.query.q, options);

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});



/**
 * @route   GET /api/products/my-products
 * @desc    Get products by current farmer
 * @access  Private (Farmer only)
 */
router.get('/my-products', [
  authenticateToken,
  requireFarmer,
  validatePagination
], async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      category: req.query.category,
      search: req.query.search,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc'
    };

    const result = await productService.getProductsByFarmer(req.user.id, options);

    res.json({
      success: true,
      message: 'Your products retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', validateUUIDParam('id'), async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);

    res.json({
      success: true,
      message: 'Product retrieved successfully',
      data: { product }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Private (Farmer only)
 */
router.post('/', [
  authenticateToken,
  requireFarmer,
  validateProductCreation
], async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update a product
 * @access  Private (Farmer only - own products)
 */
router.put('/:id', [
  authenticateToken,
  requireFarmer,
  validateProductUpdate
], async (req, res, next) => {
  try {
    const product = await productService.updateProduct(
      req.params.id, 
      req.body, 
      req.user.id
    );

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product (soft delete)
 * @access  Private (Farmer only - own products)
 */
router.delete('/:id', [
  authenticateToken,
  requireFarmer,
  ...validateUUIDParam('id')
], async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/products/:id/stock
 * @desc    Update product stock quantity
 * @access  Private (Farmer only - own products)
 */
router.patch('/:id/stock', [
  authenticateToken,
  requireFarmer,
  ...validateUUIDParam('id'),
  query('quantity')
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer')
], async (req, res, next) => {
  try {
    // First verify the product belongs to the farmer
    const existingProduct = await productService.getProductById(req.params.id);
    
    if (existingProduct.farmer.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update stock for your own products'
      });
    }

    const product = await productService.updateStock(
      req.params.id, 
      parseInt(req.query.quantity)
    );

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: { product }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/products/farmer/:farmerId
 * @desc    Get products by specific farmer
 * @access  Private
 */
router.get('/farmer/:farmerId', [
  authenticateToken,
  requireFarmerOrRetailer,
  ...validateUUIDParam('farmerId'),
  validatePagination
], async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      category: req.query.category,
      search: req.query.search,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'desc'
    };

    const result = await productService.getProductsByFarmer(req.params.farmerId, options);

    res.json({
      success: true,
      message: 'Farmer products retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;