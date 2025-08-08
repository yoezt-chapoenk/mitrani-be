const { supabase } = require('../config/supabase');

class ProductService {
  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @param {string} farmerId - ID of the farmer creating the product
   * @returns {Object} - Created product
   */
  async createProduct(productData, farmerId) {
    const {
      name,
      quantity,
      unit = 'kg',
      price,
      harvest_date,
      image_url,
      status = 'available'
    } = productData;

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name,
        quantity,
        unit,
        price,
        harvest_date,
        image_url,
        status,
        farmer_id: farmerId
      })
      .select(`
        *,
        farmer:users!farmer_id(
          id,
          full_name,
          phone,
          address
        )
      `)
      .single();

    if (error) {
      throw new Error('Failed to create product: ' + error.message);
    }

    return product;
  }

  /**
   * Get all products with optional filtering and pagination
   * @param {Object} options - Query options
   * @returns {Object} - Products and pagination info
   */
  async getProducts(options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      farmer_id,
      min_price,
      max_price,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = options;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('products')
      .select(`
        *,
        farmer:users!farmer_id(
          id,
          full_name,
          phone,
          address
        )
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (farmer_id) {
      query = query.eq('farmer_id', farmer_id);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (min_price) {
      query = query.gte('price', min_price);
    }

    if (max_price) {
      query = query.lte('price', max_price);
    }

    // Apply sorting
    const ascending = sort_order === 'asc';
    query = query.order(sort_by, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: products, error, count } = await query;

    if (error) {
      throw new Error('Failed to fetch products: ' + error.message);
    }

    const totalPages = Math.ceil(count / limit);

    return {
      products,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: count,
        items_per_page: limit,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    };
  }

  /**
   * Get a single product by ID
   * @param {string} productId - Product ID
   * @returns {Object} - Product data
   */
  async getProductById(productId) {
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        farmer:users!farmer_id(
          id,
          full_name,
          phone,
          address
        )
      `)
      .eq('id', productId)
      .single();

    if (error || !product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * Update a product
   * @param {string} productId - Product ID
   * @param {Object} updateData - Data to update
   * @param {string} farmerId - ID of the farmer updating the product
   * @returns {Object} - Updated product
   */
  async updateProduct(productId, updateData, farmerId) {
    // First check if product exists and belongs to the farmer
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('farmer_id')
      .eq('id', productId)
      .single();

    if (fetchError || !existingProduct) {
      throw new Error('Product not found');
    }

    if (existingProduct.farmer_id !== farmerId) {
      throw new Error('You can only update your own products');
    }

    const allowedFields = [
      'name',
      'quantity',
      'unit',
      'price',
      'harvest_date',
      'image_url',
      'status'
    ];

    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      throw new Error('No valid fields to update');
    }

    filteredData.updated_at = new Date().toISOString();

    const { data: product, error } = await supabase
      .from('products')
      .update(filteredData)
      .eq('id', productId)
      .select(`
        *,
        farmer:users!farmer_id(
          id,
          full_name,
          phone,
          address
        )
      `)
      .single();

    if (error) {
      throw new Error('Failed to update product: ' + error.message);
    }

    return product;
  }

  /**
   * Delete a product (soft delete)
   * @param {string} productId - Product ID
   * @param {string} farmerId - ID of the farmer deleting the product
   * @returns {boolean} - Success status
   */
  async deleteProduct(productId, farmerId) {
    // First check if product exists and belongs to the farmer
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('farmer_id')
      .eq('id', productId)
      .single();

    if (fetchError || !existingProduct) {
      throw new Error('Product not found');
    }

    if (existingProduct.farmer_id !== farmerId) {
      throw new Error('You can only delete your own products');
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      throw new Error('Failed to delete product: ' + error.message);
    }

    return true;
  }

  /**
   * Get products by farmer ID
   * @param {string} farmerId - Farmer ID
   * @param {Object} options - Query options
   * @returns {Object} - Products and pagination info
   */
  async getProductsByFarmer(farmerId, options = {}) {
    return this.getProducts({ ...options, farmer_id: farmerId });
  }

  /**
   * Update product quantity
   * @param {string} productId - Product ID
   * @param {number} quantity - New quantity
   * @returns {Object} - Updated product
   */
  async updateStock(productId, quantity) {
    const { data: product, error } = await supabase
      .from('products')
      .update({ 
        quantity: quantity
      })
      .eq('id', productId)
      .select('id, name, quantity')
      .single();

    if (error) {
      throw new Error('Failed to update quantity: ' + error.message);
    }

    return product;
  }



  /**
   * Search products
   * @param {string} searchTerm - Search term
   * @param {Object} options - Additional options
   * @returns {Object} - Search results
   */
  async searchProducts(searchTerm, options = {}) {
    return this.getProducts({ ...options, search: searchTerm });
  }
}

module.exports = new ProductService();