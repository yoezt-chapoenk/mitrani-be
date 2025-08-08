const { supabase } = require('../config/supabase');
const path = require('path');

class UploadService {
  /**
   * Upload file to Supabase Storage
   * @param {Object} file - Multer file object
   * @param {string} bucket - Storage bucket name
   * @param {string} folder - Folder path in bucket
   * @returns {Object} - Upload result with public URL
   */
  async uploadFile(file, bucket = 'products', folder = 'images') {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
      const filePath = `${folder}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error('Failed to upload file: ' + error.message);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        success: true,
        file_path: filePath,
        public_url: publicUrlData.publicUrl,
        file_name: fileName,
        file_size: file.size,
        mime_type: file.mimetype
      };
    } catch (error) {
      throw new Error('Upload failed: ' + error.message);
    }
  }

  /**
   * Upload product image
   * @param {Object} file - Multer file object
   * @param {string} productId - Product ID (optional, for organizing)
   * @returns {Object} - Upload result
   */
  async uploadProductImage(file, productId = null) {
    const folder = productId ? `images/products/${productId}` : 'images/products';
    return this.uploadFile(file, 'products', folder);
  }

  /**
   * Upload user avatar
   * @param {Object} file - Multer file object
   * @param {string} userId - User ID
   * @returns {Object} - Upload result
   */
  async uploadUserAvatar(file, userId) {
    const folder = `avatars/${userId}`;
    return this.uploadFile(file, 'users', folder);
  }

  /**
   * Delete file from Supabase Storage
   * @param {string} filePath - File path in storage
   * @param {string} bucket - Storage bucket name
   * @returns {boolean} - Success status
   */
  async deleteFile(filePath, bucket = 'products') {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw new Error('Failed to delete file: ' + error.message);
      }

      return true;
    } catch (error) {
      console.error('Delete file error:', error);
      return false;
    }
  }

  /**
   * Delete file by URL
   * @param {string} publicUrl - Public URL of the file
   * @param {string} bucket - Storage bucket name
   * @returns {boolean} - Success status
   */
  async deleteFileByUrl(publicUrl, bucket = 'products') {
    try {
      // Extract file path from public URL
      const urlParts = publicUrl.split('/');
      const bucketIndex = urlParts.findIndex(part => part === bucket);
      
      if (bucketIndex === -1) {
        throw new Error('Invalid file URL');
      }

      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      return this.deleteFile(filePath, bucket);
    } catch (error) {
      console.error('Delete file by URL error:', error);
      return false;
    }
  }

  /**
   * Validate uploaded file
   * @param {Object} file - Multer file object
   * @throws {Error} - If file is invalid
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size (5MB limit)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB
    if (file.size > maxSize) {
      throw new Error(`File size too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error('Invalid file extension.');
    }
  }

  /**
   * Get file info from Supabase Storage
   * @param {string} filePath - File path in storage
   * @param {string} bucket - Storage bucket name
   * @returns {Object} - File information
   */
  async getFileInfo(filePath, bucket = 'products') {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path.dirname(filePath), {
          limit: 1,
          search: path.basename(filePath)
        });

      if (error || !data || data.length === 0) {
        throw new Error('File not found');
      }

      const fileInfo = data[0];
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        name: fileInfo.name,
        size: fileInfo.metadata?.size || 0,
        mime_type: fileInfo.metadata?.mimetype || 'unknown',
        created_at: fileInfo.created_at,
        updated_at: fileInfo.updated_at,
        public_url: publicUrlData.publicUrl
      };
    } catch (error) {
      throw new Error('Failed to get file info: ' + error.message);
    }
  }

  /**
   * List files in a folder
   * @param {string} folder - Folder path
   * @param {string} bucket - Storage bucket name
   * @param {Object} options - List options
   * @returns {Array} - List of files
   */
  async listFiles(folder = '', bucket = 'products', options = {}) {
    try {
      const { limit = 100, offset = 0 } = options;

      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, {
          limit,
          offset,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        throw new Error('Failed to list files: ' + error.message);
      }

      return data.map(file => {
        const filePath = folder ? `${folder}/${file.name}` : file.name;
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        return {
          name: file.name,
          path: filePath,
          size: file.metadata?.size || 0,
          mime_type: file.metadata?.mimetype || 'unknown',
          created_at: file.created_at,
          updated_at: file.updated_at,
          public_url: publicUrlData.publicUrl
        };
      });
    } catch (error) {
      throw new Error('Failed to list files: ' + error.message);
    }
  }

  /**
   * Create storage bucket if it doesn't exist
   * @param {string} bucketName - Bucket name
   * @param {Object} options - Bucket options
   * @returns {boolean} - Success status
   */
  async createBucket(bucketName, options = {}) {
    try {
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: options.public || true,
        allowedMimeTypes: options.allowedMimeTypes || [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif'
        ],
        fileSizeLimit: options.fileSizeLimit || 5242880 // 5MB
      });

      if (error && !error.message.includes('already exists')) {
        throw new Error('Failed to create bucket: ' + error.message);
      }

      return true;
    } catch (error) {
      console.error('Create bucket error:', error);
      return false;
    }
  }
}

module.exports = new UploadService();