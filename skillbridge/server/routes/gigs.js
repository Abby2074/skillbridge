const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken, requireStudent, optionalAuth } = require('../middleware/auth');

// GET /api/gigs - Browse all active gigs
router.get('/', optionalAuth, (req, res) => {
  try {
    const { search, category_id, max_price, min_rating, sort, delivery_format } = req.query;

    let query = `
      SELECT g.*, u.full_name as freelancer_name, u.institution, u.profile_photo_url, u.bio as freelancer_bio,
        sc.category_name,
        (SELECT COUNT(*) FROM service_orders so WHERE so.freelancer_id = g.freelancer_id AND so.status = 'completed') as completed_orders,
        (SELECT ROUND(AVG(sr.star_rating), 1) FROM service_reviews sr WHERE sr.reviewee_id = g.freelancer_id) as avg_rating,
        (SELECT COUNT(*) FROM service_reviews sr WHERE sr.reviewee_id = g.freelancer_id) as review_count
      FROM service_gigs g
      JOIN users u ON g.freelancer_id = u.user_id
      JOIN service_categories sc ON g.category_id = sc.category_id
      WHERE g.status = 'active' AND u.is_active = 1
    `;
    const params = [];

    if (search) {
      query += ` AND (g.title LIKE ? OR g.description LIKE ? OR u.full_name LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (category_id) {
      query += ` AND g.category_id = ?`;
      params.push(category_id);
    }
    if (max_price) {
      query += ` AND g.min_price <= ?`;
      params.push(parseFloat(max_price));
    }
    if (delivery_format && delivery_format !== 'all') {
      query += ` AND (g.delivery_format = ? OR g.delivery_format = 'both')`;
      params.push(delivery_format);
    }

    if (sort === 'price_low') query += ` ORDER BY g.min_price ASC`;
    else if (sort === 'price_high') query += ` ORDER BY g.max_price DESC`;
    else if (sort === 'rating') query += ` ORDER BY avg_rating DESC NULLS LAST`;
    else if (sort === 'newest') query += ` ORDER BY g.created_at DESC`;
    else query += ` ORDER BY g.created_at DESC`;

    const gigs = db.prepare(query).all(...params);
    res.json(gigs);
  } catch (err) {
    console.error('Get gigs error:', err);
    res.status(500).json({ error: 'Failed to fetch gigs' });
  }
});

// GET /api/gigs/categories - Get all service categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM service_categories WHERE is_active = 1 ORDER BY category_name').all();
    res.json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/gigs/categories/request - Request a new category
router.post('/categories/request', authenticateToken, [
  body('category_name').trim().notEmpty().withMessage('Category name is required'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { category_name, description } = req.body;
    const request_id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO service_category_requests (request_id, user_id, category_name, description, status, submitted_at)
      VALUES (?, ?, ?, ?, 'pending', ?)`).run(request_id, req.user.user_id, category_name, description || null, now);

    res.status(201).json({ message: 'Category request submitted', request_id });
  } catch (err) {
    console.error('Category request error:', err);
    res.status(500).json({ error: 'Failed to submit category request' });
  }
});

// GET /api/gigs/my/listings - Get current user's gigs (MUST be before /:id)
router.get('/my/listings', authenticateToken, (req, res) => {
  try {
    const gigs = db.prepare(`
      SELECT g.*, sc.category_name,
        (SELECT COUNT(*) FROM service_orders so WHERE so.gig_id = g.gig_id) as total_orders,
        (SELECT COUNT(*) FROM service_orders so WHERE so.gig_id = g.gig_id AND so.status = 'completed') as completed_orders
      FROM service_gigs g
      JOIN service_categories sc ON g.category_id = sc.category_id
      WHERE g.freelancer_id = ? AND g.status != 'archived'
      ORDER BY g.created_at DESC
    `).all(req.user.user_id);
    res.json(gigs);
  } catch (err) {
    console.error('Get my gigs error:', err);
    res.status(500).json({ error: 'Failed to fetch your gigs' });
  }
});

// GET /api/gigs/:id - Get gig detail
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const gig = db.prepare(`
      SELECT g.*, u.full_name as freelancer_name, u.institution, u.programme, u.bio as freelancer_bio,
        u.profile_photo_url, u.user_id as freelancer_user_id,
        sc.category_name,
        (SELECT COUNT(*) FROM service_orders so WHERE so.freelancer_id = g.freelancer_id AND so.status = 'completed') as completed_orders,
        (SELECT ROUND(AVG(sr.star_rating), 1) FROM service_reviews sr WHERE sr.reviewee_id = g.freelancer_id) as avg_rating,
        (SELECT COUNT(*) FROM service_reviews sr WHERE sr.reviewee_id = g.freelancer_id) as review_count
      FROM service_gigs g
      JOIN users u ON g.freelancer_id = u.user_id
      JOIN service_categories sc ON g.category_id = sc.category_id
      WHERE g.gig_id = ?
    `).get(req.params.id);

    if (!gig) return res.status(404).json({ error: 'Gig not found' });

    // Get reviews for this freelancer
    const reviews = db.prepare(`
      SELECT sr.*, u.full_name as reviewer_name
      FROM service_reviews sr
      JOIN users u ON sr.reviewer_id = u.user_id
      WHERE sr.reviewee_id = ? AND sr.is_flagged = 0
      ORDER BY sr.created_at DESC
      LIMIT 10
    `).all(gig.freelancer_id);

    res.json({ ...gig, reviews });
  } catch (err) {
    console.error('Get gig error:', err);
    res.status(500).json({ error: 'Failed to fetch gig' });
  }
});

// POST /api/gigs - Create a new gig (students only)
router.post('/', authenticateToken, requireStudent, [
  body('title').trim().notEmpty().isLength({ max: 200 }).withMessage('Title is required (max 200 chars)'),
  body('description').trim().notEmpty().isLength({ max: 5000 }).withMessage('Description is required (max 5000 chars)'),
  body('category_id').trim().notEmpty().withMessage('Category is required'),
  body('min_price').isFloat({ min: 1, max: 100000 }).withMessage('Minimum price must be between 1 and 100,000'),
  body('max_price').isFloat({ min: 1, max: 100000 }).withMessage('Maximum price must be between 1 and 100,000'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, category_id, min_price, max_price, delivery_time, delivery_format } = req.body;

    if (parseFloat(min_price) > parseFloat(max_price)) {
      return res.status(400).json({ error: 'Minimum price cannot exceed maximum price' });
    }

    const gig_id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO service_gigs (gig_id, freelancer_id, category_id, title, description, min_price, max_price, delivery_time, delivery_format, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`).run(
      gig_id, req.user.user_id, category_id, title, description,
      parseFloat(min_price), parseFloat(max_price),
      delivery_time || null, delivery_format || 'remote', now, now
    );

    res.status(201).json({ message: 'Gig created', gig_id });
  } catch (err) {
    console.error('Create gig error:', err);
    res.status(500).json({ error: 'Failed to create gig' });
  }
});

// PUT /api/gigs/:id - Update a gig
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const gig = db.prepare('SELECT * FROM service_gigs WHERE gig_id = ?').get(req.params.id);
    if (!gig) return res.status(404).json({ error: 'Gig not found' });
    if (gig.freelancer_id !== req.user.user_id) return res.status(403).json({ error: 'Not your gig' });

    const { title, description, category_id, min_price, max_price, delivery_time, delivery_format, status } = req.body;
    const now = new Date().toISOString();

    db.prepare(`UPDATE service_gigs SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      category_id = COALESCE(?, category_id),
      min_price = COALESCE(?, min_price),
      max_price = COALESCE(?, max_price),
      delivery_time = COALESCE(?, delivery_time),
      delivery_format = COALESCE(?, delivery_format),
      status = COALESCE(?, status),
      updated_at = ?
      WHERE gig_id = ?`).run(
      title || null, description || null, category_id || null,
      min_price ? parseFloat(min_price) : null, max_price ? parseFloat(max_price) : null,
      delivery_time || null, delivery_format || null, status || null, now, req.params.id
    );

    res.json({ message: 'Gig updated' });
  } catch (err) {
    console.error('Update gig error:', err);
    res.status(500).json({ error: 'Failed to update gig' });
  }
});

// DELETE /api/gigs/:id - Archive a gig
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const gig = db.prepare('SELECT * FROM service_gigs WHERE gig_id = ?').get(req.params.id);
    if (!gig) return res.status(404).json({ error: 'Gig not found' });
    if (gig.freelancer_id !== req.user.user_id) return res.status(403).json({ error: 'Not your gig' });

    db.prepare("UPDATE service_gigs SET status = 'archived', updated_at = ? WHERE gig_id = ?").run(new Date().toISOString(), req.params.id);
    res.json({ message: 'Gig archived' });
  } catch (err) {
    console.error('Delete gig error:', err);
    res.status(500).json({ error: 'Failed to archive gig' });
  }
});

module.exports = router;
