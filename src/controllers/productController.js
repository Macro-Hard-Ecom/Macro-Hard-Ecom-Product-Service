const Product = require('../models/Product');
const { getProductOrderStats } = require('../services/orderServiceClient');

/**
 * @desc    Get all products (with optional filtering)
 * @route   GET /api/products
 * @access  Public
 */
const getAllProducts = async (req, res, next) => {
  try {
    const { category, available, search, createdBy } = req.query;

    // Build dynamic filter object
    const filter = {};
    if (category) filter.category = category;
    if (available !== undefined) filter.isAvailable = available === 'true';
    if (search) filter.$text = { $search: search };
    if (createdBy) filter.createdBy = createdBy; // filter by company/user

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a new product
 * @route   POST /api/products
 * @access  Private (requires JWT from User Service)
 */
const addProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, imageUrl, stock } = req.body;

    // createdBy is taken from the JWT token (set by auth middleware)
    // This links every product to the company/user who created it
    const createdBy = req.user?.sub || req.user?.id || req.user?.email;

    if (!createdBy) {
      return res.status(401).json({ success: false, message: 'Unable to identify user from token.' });
    }

    const product = await Product.create({
      name,
      description,
      price,
      category,
      imageUrl,
      stock,
      createdBy,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Private (requires JWT from User Service)
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Only the company/user who created the product can update it
    const requesterId = req.user?.sub || req.user?.id || req.user?.email;
    if (product.createdBy !== requesterId) {
      return res.status(403).json({ success: false, message: 'Not authorised to update this product' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private (requires JWT from User Service)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Only the company/user who created the product can delete it
    const requesterId = req.user?.sub || req.user?.id || req.user?.email;
    if (product.createdBy !== requesterId) {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this product' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Product deleted successfully', data: {} });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get product with order statistics (inter-service call to Order Service)
 * @route   GET /api/products/:id/stats
 * @access  Public
 *
 * This is the KEY INTEGRATION POINT for the CTSE assignment.
 * Calls the Order Service to enrich product data with order statistics.
 */
const getProductStats = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Inter-service call to Order Service
    const orderStats = await getProductOrderStats(req.params.id);

    res.status(200).json({
      success: true,
      data: {
        product,
        orderStats: {
          orderCount: orderStats.orderCount,
          totalRevenue: orderStats.totalRevenue,
          orderServiceAvailable: orderStats.success,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
};
