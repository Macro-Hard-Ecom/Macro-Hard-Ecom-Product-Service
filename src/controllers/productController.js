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

    // createdBy is the user's database ID from the JWT claim `userId`.
    // The auth middleware normalises this into req.user.userId.
    // We deliberately do NOT fall back to email — IDs are stable, emails can change.
    const createdBy = req.user?.userId;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message:
          'Unable to identify user ID from token. ' +
          'The User Service JWT must include a `userId` claim with the numeric user ID.',
      });
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

    // Only the user who created the product can update it — compare by userId
    const requesterId = req.user?.userId;
    if (!requesterId || product.createdBy !== requesterId) {
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

    // Only the user who created the product can delete it — compare by userId
    const requesterId = req.user?.userId;
    if (!requesterId || product.createdBy !== requesterId) {
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

/**
 * @desc    Get the count of all products listed by a specific user/company
 * @route   GET /api/products/count/:id
 * @access  Public
 *
 * :id is the createdBy value — the user/company ID from the User Service JWT.
 * Any service (e.g. User Service) can call this to know how many products
 * a seller has listed without fetching the full product list.
 */
const getProductCountByUser = async (req, res, next) => {
  try {
    const count = await Product.countDocuments({ createdBy: req.params.id });

    res.status(200).json({
      success: true,
      userId: req.params.id,
      count,
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
  getProductCountByUser,
};
