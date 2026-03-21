const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Product Service API',
      version: '1.0.0',
      description:
        'Product Service for the Food Ordering System — CTSE Assignment 2026 (SE4010). ' +
        'Handles product catalog management and integrates with the Order Service.',
      contact: {
        name: 'Wajee',
        email: 'wajee@mazzdigi.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
      {
        url: 'http://98.81.229.185:3000',
        description: 'AWS EC2 Production Server',
        variables: {
          'ec2-public-ip': {
            default: 'your-ec2-ip',
            description: 'EC2 public IP address',
          },
        },
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
            name: { type: 'string', example: 'Chicken Burger' },
            description: { type: 'string', example: 'Crispy fried chicken in a brioche bun' },
            price: { type: 'number', example: 12.99 },
            category: { type: 'string', example: 'Burgers' },
            imageUrl: { type: 'string', example: 'https://example.com/chicken-burger.jpg' },
            stock: { type: 'integer', example: 50 },
            isAvailable: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ProductInput: {
          type: 'object',
          required: ['name', 'description', 'price', 'category'],
          properties: {
            name: { type: 'string', example: 'Chicken Burger' },
            description: { type: 'string', example: 'Crispy fried chicken in a brioche bun' },
            price: { type: 'number', example: 12.99 },
            category: { type: 'string', example: 'Burgers' },
            imageUrl: { type: 'string', example: 'https://example.com/chicken-burger.jpg' },
            stock: { type: 'integer', example: 50 },
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
