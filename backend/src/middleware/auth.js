const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'trendy_apparel_group14_jwt_secret_key_2026';

/**
 * Verifies JWT Bearer token (SR1)
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Missing JWT token.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired session token.' });
  }
}

/**
 * Enforces Role-Based Access Control (RBAC) across factory modules
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated request.' });
    }
    if (req.user.role === 'SYSTEM_ADMIN' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      error: `Access denied. Role '${req.user.role}' is not authorized for this resource.`,
      requiredRoles: allowedRoles,
    });
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  authorizeRoles,
};
