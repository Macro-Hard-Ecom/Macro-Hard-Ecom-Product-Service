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
    const decoded = jwt.decode(token);

    // Build req.user — prefer the explicit userId claim over sub (which is email)
    // The User Service JWT should include a `userId` claim with the numeric database ID.
    // Fallback chain: decoded.userId → decoded.id → decoded.sub (email, last resort)
    req.user = {
      ...decoded,
      // Normalise to a single `userId` field so controllers don't need to guess
      userId: decoded?.userId?.toString() || decoded?.id?.toString() || null,
    };

    if (!req.user.userId) {
      // Token is valid but contains no user ID claim — this means the User Service
      // hasn't added the userId claim to the JWT yet.
      console.warn(
        '[AUTH] Token validated but no userId claim found. ' +
        'Ask the User Service developer to add `.claim("userId", user.getId())` to JwtUtil.generateToken().'
      );
    }

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
