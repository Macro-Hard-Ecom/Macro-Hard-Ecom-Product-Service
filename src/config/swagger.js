const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Product Service API',
      version: '1.0.0',
      description:
        'Product Service for the Macrohard Marketplace — CTSE Assignment 2026 (SE4010). ' +
        'Handles product/listing catalog management across all categories and integrates with the Order Service.',
      contact: {
        name: 'Wajee',
        email: 'shaheedwajee@gmail.com',
      },
    },
    servers: [
      {
        url: 'http://98.81.229.185:3000',
        description: 'AWS EC2 Production Server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token issued by the User Service',
        },
      },
      schemas: {
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '65abc123def456' },
            name: { type: 'string', example: 'Samsung Galaxy S24' },
            description: { type: 'string', example: 'Excellent condition, 256GB, original box included' },
            price: { type: 'number', example: 450.00 },
            category: {
              type: 'string',
              enum: ['Electronics', 'Vehicles', 'Property', 'Furniture', 'Fashion', 'Services', 'Food & Beverages', 'Sports & Leisure', 'Other'],
              example: 'Electronics',
            },
            imageUrl: { type: 'string', example: 'https://example.com/phone.jpg' },
            stock: { type: 'integer', example: 1 },
            isAvailable: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ProductInput: {
          type: 'object',
          required: ['name', 'description', 'price', 'category'],
          properties: {
            name: { type: 'string', example: 'Samsung Galaxy S24' },
            description: { type: 'string', example: 'Excellent condition, 256GB, original box included' },
            price: { type: 'number', example: 450.00 },
            category: {
              type: 'string',
              enum: ['Electronics', 'Vehicles', 'Property', 'Furniture', 'Fashion', 'Services', 'Food & Beverages', 'Sports & Leisure', 'Other'],
              example: 'Electronics',
            },
            imageUrl: { type: 'string', example: 'https://example.com/phone.jpg' },
            stock: { type: 'integer', example: 1 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message here' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
