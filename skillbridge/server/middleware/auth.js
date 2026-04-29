const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Use env variable or generate a random secret (logged once so dev can copy it)
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  No JWT_SECRET set in env — generated ephemeral secret. Sessions will not persist across server restarts. Set JWT_SECRET in .env for persistence.');
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Token invalid, continue without auth
    }
  }
  next();
}

function requireStudent(req, res, next) {
  if (!req.user || !req.user.is_student) {
    return res.status(403).json({ error: 'Only verified students can perform this action' });
  }
  next();
}

module.exports = { authenticateToken, requireAdmin, requireStudent, optionalAuth, JWT_SECRET };
