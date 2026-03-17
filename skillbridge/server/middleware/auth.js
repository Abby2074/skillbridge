const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'skillbridge_dev_secret_key_2024';

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
