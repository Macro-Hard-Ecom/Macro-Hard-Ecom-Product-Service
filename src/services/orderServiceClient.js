const axios = require('axios');

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://51.21.181.2:5000';

/**
 * Order Service HTTP Client
 *
 * This is the inter-service communication layer.
 * Product Service calls Order Service to fetch order statistics per product.
 *
 */

/**
 * Fetch the total number of times a product has been ordered.
 * Calls: GET {ORDER_SERVICE_URL}/api/orders/product-stats/:productId
 *
 * @param {string} productId - MongoDB ObjectId of the product
 * @returns {Promise<number>} - Total order count for this product
 */
const getProductOrderStats = async (productId) => {
  try {
    const response = await axios.get(
      `${ORDER_SERVICE_URL}/api/orders/product-stats/${productId}`,
      {
        timeout: 5000, // 5 second timeout — fail fast, don't hang
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'product-service', // Identify caller for logging
        },
      }
    );
    return {
      success: true,
      orderCount: response.data.orderCount || 0,
      totalRevenue: response.data.totalRevenue || 0,
    };
  } catch (error) {
    // Graceful degradation — if Order Service is down, return zeros
    // We do NOT fail the entire request; the product data is still valid
    console.error(
      `[ORDER SERVICE CLIENT] Failed to fetch stats for product ${productId}:`,
      error.message
    );
    return {
      success: false,
      orderCount: 0,
      totalRevenue: 0,
      error: 'Order Service unavailable',
    };
  }
};

module.exports = { getProductOrderStats };
