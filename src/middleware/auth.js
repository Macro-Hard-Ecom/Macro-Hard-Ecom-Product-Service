const jwt = require('jsonwebtoken');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://54.254.157.28:8080';

/**
 * JWT Authentication Middleware.
 *
 * Validates the Bearer token by calling the User Service /validateToken endpoint.
 * This is the inter-service communication point between Product Service and User Service.
 *
 * Flow:
 *  1. Extract token from Authorization header
 *  2. Call User Service GET /api/auth/validateToken?token=...
 *  3. If User Service returns true  → allow request through
 *  4. If User Service returns false → 401 Unauthorized
 *  5. If User Service is unreachable → 503 Service Unavailable
 *
 * No JWT_SECRET needed — the User Service owns token verification.
 *
 * Usage: Add `protect` to any route that requires authentication.
 */

const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  // ── Verify token via User Service (inter-service communication) ────────────
  try {
    const response = await axios.get(
      `${USER_SERVICE_URL}/api/auth/validateToken`,
      {
        params: { token },
        timeout: 5000,
      }
    );

    if (response.data !== true) {
      return res.status(401).json({
        success: false,
        message: 'Token rejected by User Service.',
      });
    }

    // Decode the token payload without verification (User Service already verified it)
    // This gives us the user's email and role to attach to the request
    const decoded = jwt.decode(token);
    req.user = decoded;

    next();

  } catch (error) {
    // If User Service is completely unreachable, we cannot verify the token
    // so we reject the request rather than allowing unverified access
    console.error('[AUTH] User Service unreachable:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Authentication service unavailable. Please try again later.',
    });
  }
};

module.exports = { protect };
