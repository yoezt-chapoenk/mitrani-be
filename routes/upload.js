const express = require('express');
const multer = require('multer');
const uploadService = require('../services/uploadService');
const { authenticateToken, requireFarmerOrRetailer } = require('../middlewares/auth');
const { validateUUIDParam } = require('../middlewares/validation');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
    files: 1 // Only allow 1 file per request
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'), false);
    }
  }
});

/**
 * @route   POST /api/upload/product-image
 * @desc    Upload product image
 * @access  Private (Farmer only)
 */
router.post('/product-image', [
  authenticateToken,
  requireFarmerOrRetailer,
  upload.single('image')
], async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const productId = req.body.product_id || null;
    const result = await uploadService.uploadProductImage(req.file, productId);

    res.json({
      success: true,
      message: 'Product image uploaded successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/upload/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/avatar', [
  authenticateToken,
  upload.single('avatar')
], async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar file provided'
      });
    }

    const result = await uploadService.uploadUserAvatar(req.file, req.user.id);

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/upload/file
 * @desc    Delete a file by URL
 * @access  Private
 */
router.delete('/file', [
  authenticateToken,
  requireFarmerOrRetailer
], async (req, res, next) => {
  try {
    const { file_url, bucket = 'products' } = req.body;

    if (!file_url) {
      return res.status(400).json({
        success: false,
        message: 'File URL is required'
      });
    }

    const success = await uploadService.deleteFileByUrl(file_url, bucket);

    if (success) {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete file'
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/upload/files
 * @desc    List files in a folder
 * @access  Private (Admin or file owner)
 */
router.get('/files', [
  authenticateToken
], async (req, res, next) => {
  try {
    const { 
      folder = '', 
      bucket = 'products', 
      limit = 50, 
      offset = 0 
    } = req.query;

    // Only allow admins or users to list their own files
    if (req.user.role !== 'admin') {
      // For non-admins, restrict folder access
      if (bucket === 'users' && !folder.includes(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own files'
        });
      }
    }

    const files = await uploadService.listFiles(folder, bucket, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      message: 'Files retrieved successfully',
      data: { files }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/upload/file-info
 * @desc    Get file information
 * @access  Private
 */
router.get('/file-info', [
  authenticateToken
], async (req, res, next) => {
  try {
    const { file_path, bucket = 'products' } = req.query;

    if (!file_path) {
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      });
    }

    const fileInfo = await uploadService.getFileInfo(file_path, bucket);

    res.json({
      success: true,
      message: 'File information retrieved successfully',
      data: { file: fileInfo }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/upload/multiple-images
 * @desc    Upload multiple product images
 * @access  Private (Farmer only)
 */
router.post('/multiple-images', [
  authenticateToken,
  requireFarmerOrRetailer,
  upload.array('images', 5) // Allow up to 5 images
], async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const productId = req.body.product_id || null;
    const uploadPromises = req.files.map(file => 
      uploadService.uploadProductImage(file, productId)
    );

    const results = await Promise.all(uploadPromises);

    res.json({
      success: true,
      message: `${results.length} images uploaded successfully`,
      data: { uploads: results }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/upload/create-bucket
 * @desc    Create a new storage bucket (Admin only)
 * @access  Private (Admin only)
 */
router.post('/create-bucket', [
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create storage buckets'
      });
    }
    next();
  }
], async (req, res, next) => {
  try {
    const { bucket_name, options = {} } = req.body;

    if (!bucket_name) {
      return res.status(400).json({
        success: false,
        message: 'Bucket name is required'
      });
    }

    const success = await uploadService.createBucket(bucket_name, options);

    if (success) {
      res.json({
        success: true,
        message: 'Bucket created successfully',
        data: { bucket_name }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create bucket'
      });
    }
  } catch (error) {
    next(error);
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 5 files per request.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

module.exports = router;