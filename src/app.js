require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

connectDB();

// Helmet sets secure HTTP response headers
// Relaxed CSP for Swagger UI to work properly
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting — prevents brute force and DDoS (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(limiter);

app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));              // HTTP request logging

// Swagger API Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health Check (used by load balancers and CI/CD to verify deployment) 
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'product-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Routes
app.use('/api/products', productRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use(errorHandler);
const PORT = process.env.PORT || 3000;

// Only start listening if not in test mode (Jest imports app directly)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Product Service running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
