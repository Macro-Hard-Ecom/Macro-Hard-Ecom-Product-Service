const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Product = require('../src/models/Product');

// ── Mock the Order Service client so tests don't need a real Order Service ──
jest.mock('../src/services/orderServiceClient', () => ({
  getProductOrderStats: jest.fn().mockResolvedValue({
    success: true,
    orderCount: 5,
    totalRevenue: 64.95,
  }),
}));

// ── Mock auth middleware — bypass User Service call in tests ─────────────────
// In production, auth.js calls the User Service /validateToken endpoint.
// In tests we skip that HTTP call and just attach a fake user to the request.
jest.mock('../src/middleware/auth', () => ({
  protect: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    req.user = { userId: 'user123', email: 'test@test.com' };
    next();
  },
}));

// ── Mock mongoose — return proper connection shape so db.js doesn't crash ────
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue({ connection: { host: 'mocked-host' } }),
  };
});

// ── Mock the Product model ───────────────────────────────────────────────────
jest.mock('../src/models/Product');

// ── Fake token for protected routes (any non-empty Bearer token works in tests)
const testToken = 'test-token-bypassed-by-mock';

// ── Sample product data ──────────────────────────────────────────────────────
const sampleProduct = {
  _id: new mongoose.Types.ObjectId().toString(),
  name: 'Chicken Burger',
  description: 'Crispy fried chicken in a brioche bun',
  price: 12.99,
  category: 'Burgers',
  imageUrl: 'https://example.com/chicken-burger.jpg',
  stock: 50,
  isAvailable: true,
  createdBy: 'user123', // matches req.user.userId set by auth mock
  createdAt: new Date().toISOString(),
};

// ────────────────────────────────────────────────────────────────────────────
describe('Product Service API', () => {

  // ── Health Check ──────────────────────────────────────────────────────────
  describe('GET /health', () => {
    it('should return 200 and healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.service).toBe('product-service');
      expect(res.body.status).toBe('healthy');
    });
  });

  // ── GET /api/products ─────────────────────────────────────────────────────
  describe('GET /api/products', () => {
    it('should return all products', async () => {
      Product.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([sampleProduct]),
      });

      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return empty array when no products exist', async () => {
      Product.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
    });
  });

  // ── GET /api/products/:id ─────────────────────────────────────────────────
  describe('GET /api/products/:id', () => {
    it('should return a product by ID', async () => {
      Product.findById.mockResolvedValue(sampleProduct);

      const res = await request(app).get(`/api/products/${sampleProduct._id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Chicken Burger');
    });

    it('should return 404 if product not found', async () => {
      Product.findById.mockResolvedValue(null);

      const res = await request(app).get(`/api/products/${new mongoose.Types.ObjectId()}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/products/:id/stats ───────────────────────────────────────────
  describe('GET /api/products/:id/stats', () => {
    it('should return product with order stats from Order Service', async () => {
      Product.findById.mockResolvedValue(sampleProduct);

      const res = await request(app).get(`/api/products/${sampleProduct._id}/stats`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderStats.orderCount).toBe(5);
      expect(res.body.data.orderStats.totalRevenue).toBe(64.95);
    });
  });

  // ── POST /api/products (protected) ───────────────────────────────────────
  describe('POST /api/products', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/products').send(sampleProduct);
      expect(res.status).toBe(401);
    });

    it('should create a product with valid token', async () => {
      Product.create.mockResolvedValue(sampleProduct);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Chicken Burger',
          description: 'Crispy fried chicken in a brioche bun',
          price: 12.99,
          category: 'Burgers',
          stock: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Chicken Burger');
    });
  });

  // ── PUT /api/products/:id (protected) ────────────────────────────────────
  describe('PUT /api/products/:id', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).put(`/api/products/${sampleProduct._id}`).send({ price: 15 });
      expect(res.status).toBe(401);
    });

    it('should update a product with valid token', async () => {
      const updatedProduct = { ...sampleProduct, price: 15.99 };
      // findById is called first to check ownership, then findByIdAndUpdate
      Product.findById.mockResolvedValue(sampleProduct);
      Product.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      const res = await request(app)
        .put(`/api/products/${sampleProduct._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ price: 15.99 });

      expect(res.status).toBe(200);
      expect(res.body.data.price).toBe(15.99);
    });
  });

  // ── DELETE /api/products/:id (protected) ─────────────────────────────────
  describe('DELETE /api/products/:id', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).delete(`/api/products/${sampleProduct._id}`);
      expect(res.status).toBe(401);
    });

    it('should delete a product with valid token', async () => {
      // findById is called first to check ownership, then findByIdAndDelete
      Product.findById.mockResolvedValue(sampleProduct);
      Product.findByIdAndDelete.mockResolvedValue(sampleProduct);

      const res = await request(app)
        .delete(`/api/products/${sampleProduct._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── 404 Route ─────────────────────────────────────────────────────────────
  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/unknown-route');
      expect(res.status).toBe(404);
    });
  });
});
