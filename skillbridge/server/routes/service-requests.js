const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// GET /api/service-requests - Browse all open requests
router.get('/', optionalAuth, (req, res) => {
  try {
    const { search, category_id, max_budget, sort } = req.query;

    let query = `
      SELECT sr.*, u.full_name as buyer_name, u.institution, u.profile_photo_url,
        sc.category_name,
        (SELECT COUNT(*) FROM service_request_applications sra WHERE sra.request_id = sr.request_id) as application_count
      FROM service_requests sr
      JOIN users u ON sr.buyer_id = u.user_id
      LEFT JOIN service_categories sc ON sr.category_id = sc.category_id
      WHERE sr.status = 'open'
    `;
    const params = [];

    if (search) {
      query += ` AND (sr.title LIKE ? OR sr.description LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (category_id) {
      query += ` AND sr.category_id = ?`;
      params.push(category_id);
    }
    if (max_budget) {
      query += ` AND sr.budget_min <= ?`;
      params.push(parseFloat(max_budget));
    }

    if (sort === 'budget_high') query += ` ORDER BY sr.budget_max DESC`;
    else if (sort === 'budget_low') query += ` ORDER BY sr.budget_min ASC`;
    else if (sort === 'deadline') query += ` ORDER BY sr.deadline ASC`;
    else query += ` ORDER BY sr.created_at DESC`;

    const requests = db.prepare(query).all(...params);
    res.json(requests);
  } catch (err) {
    console.error('Get service requests error:', err);
    res.status(500).json({ error: 'Failed to fetch service requests' });
  }
});

// GET /api/service-requests/my - Get current user's requests
router.get('/my', authenticateToken, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT sr.*, sc.category_name,
        (SELECT COUNT(*) FROM service_request_applications sra WHERE sra.request_id = sr.request_id) as application_count
      FROM service_requests sr
      LEFT JOIN service_categories sc ON sr.category_id = sc.category_id
      WHERE sr.buyer_id = ?
      ORDER BY sr.created_at DESC
    `).all(req.user.user_id);
    res.json(requests);
  } catch (err) {
    console.error('Get my requests error:', err);
    res.status(500).json({ error: 'Failed to fetch your requests' });
  }
});

// GET /api/service-requests/:id - Get request detail
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const request = db.prepare(`
      SELECT sr.*, u.full_name as buyer_name, u.institution, u.profile_photo_url,
        sc.category_name
      FROM service_requests sr
      JOIN users u ON sr.buyer_id = u.user_id
      LEFT JOIN service_categories sc ON sr.category_id = sc.category_id
      WHERE sr.request_id = ?
    `).get(req.params.id);

    if (!request) return res.status(404).json({ error: 'Request not found' });

    // Get applications if the requester is the buyer
    let applications = [];
    if (req.user && req.user.user_id === request.buyer_id) {
      applications = db.prepare(`
        SELECT sra.*, u.full_name as freelancer_name, u.institution as freelancer_institution, u.profile_photo_url,
          (SELECT ROUND(AVG(sr2.star_rating), 1) FROM service_reviews sr2 WHERE sr2.reviewee_id = sra.freelancer_id) as avg_rating,
          (SELECT COUNT(*) FROM service_orders so WHERE so.freelancer_id = sra.freelancer_id AND so.status = 'completed') as completed_orders
        FROM service_request_applications sra
        JOIN users u ON sra.freelancer_id = u.user_id
        WHERE sra.request_id = ?
        ORDER BY sra.created_at DESC
      `).all(req.params.id);
    }

    res.json({ ...request, applications });
  } catch (err) {
    console.error('Get request error:', err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// POST /api/service-requests - Create a new service request (any user)
router.post('/', authenticateToken, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, description, category_id, budget_min, budget_max, deadline } = req.body;
    const request_id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO service_requests (request_id, buyer_id, category_id, title, description, budget_min, budget_max, deadline, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`).run(
      request_id, req.user.user_id, category_id || null, title, description,
      budget_min ? parseFloat(budget_min) : null, budget_max ? parseFloat(budget_max) : null,
      deadline || null, now, now
    );

    res.status(201).json({ message: 'Service request posted', request_id });
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// PUT /api/service-requests/:id - Update a request
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM service_requests WHERE request_id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.buyer_id !== req.user.user_id) return res.status(403).json({ error: 'Not your request' });

    const { title, description, category_id, budget_min, budget_max, deadline, status } = req.body;
    const now = new Date().toISOString();

    db.prepare(`UPDATE service_requests SET
      title = COALESCE(?, title), description = COALESCE(?, description),
      category_id = COALESCE(?, category_id),
      budget_min = COALESCE(?, budget_min), budget_max = COALESCE(?, budget_max),
      deadline = COALESCE(?, deadline), status = COALESCE(?, status), updated_at = ?
      WHERE request_id = ?`).run(
      title || null, description || null, category_id || null,
      budget_min ? parseFloat(budget_min) : null, budget_max ? parseFloat(budget_max) : null,
      deadline || null, status || null, now, req.params.id
    );

    res.json({ message: 'Request updated' });
  } catch (err) {
    console.error('Update request error:', err);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// DELETE /api/service-requests/:id - Cancel a request
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM service_requests WHERE request_id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.buyer_id !== req.user.user_id) return res.status(403).json({ error: 'Not your request' });

    db.prepare("UPDATE service_requests SET status = 'cancelled', updated_at = ? WHERE request_id = ?").run(new Date().toISOString(), req.params.id);
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    console.error('Delete request error:', err);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// POST /api/service-requests/:id/apply - Apply to a request (freelancer)
router.post('/:id/apply', authenticateToken, [
  body('cover_message').trim().notEmpty().withMessage('Cover message is required'),
  body('proposed_price').isFloat({ min: 1 }).withMessage('Price must be at least 1'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Must be a student to apply
    const user = db.prepare('SELECT is_student FROM users WHERE user_id = ?').get(req.user.user_id);
    if (!user || !user.is_student) {
      return res.status(403).json({ error: 'Only students can apply to service requests' });
    }

    const request = db.prepare('SELECT * FROM service_requests WHERE request_id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'open') return res.status(400).json({ error: 'This request is no longer open' });
    if (request.buyer_id === req.user.user_id) return res.status(400).json({ error: 'Cannot apply to your own request' });

    // Check if already applied
    const existing = db.prepare('SELECT application_id FROM service_request_applications WHERE request_id = ? AND freelancer_id = ?').get(req.params.id, req.user.user_id);
    if (existing) return res.status(409).json({ error: 'You have already applied' });

    const { cover_message, proposed_price, proposed_timeline } = req.body;
    const application_id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO service_request_applications (application_id, request_id, freelancer_id, cover_message, proposed_price, proposed_timeline, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`).run(
      application_id, req.params.id, req.user.user_id, cover_message,
      parseFloat(proposed_price), proposed_timeline || null, now
    );

    res.status(201).json({ message: 'Application submitted', application_id });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// PUT /api/service-requests/:id/applications/:appId/accept - Accept an application
router.put('/:id/applications/:appId/accept', authenticateToken, (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM service_requests WHERE request_id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.buyer_id !== req.user.user_id) return res.status(403).json({ error: 'Not your request' });

    const application = db.prepare('SELECT * FROM service_request_applications WHERE application_id = ?').get(req.params.appId);
    if (!application) return res.status(404).json({ error: 'Application not found' });

    const now = new Date().toISOString();
    const agreed_price = application.proposed_price;
    const commission = agreed_price * 0.10;
    const earnings = agreed_price * 0.90;

    // Check buyer has enough balance
    const buyer = db.prepare('SELECT wallet_balance FROM users WHERE user_id = ?').get(req.user.user_id);
    if (buyer.wallet_balance < agreed_price) {
      return res.status(400).json({ error: 'Insufficient wallet balance. Please top up.' });
    }

    // Atomic transaction: deduct from buyer, create order, update statuses
    const createOrder = db.transaction(() => {
      // Deduct from buyer wallet (escrow)
      db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?').run(agreed_price, req.user.user_id);

      // Create order
      const order_id = uuidv4();
      db.prepare(`INSERT INTO service_orders (order_id, request_id, buyer_id, freelancer_id, agreed_price, platform_commission, freelancer_earnings, description, status, escrow_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', 'held', ?)`).run(
        order_id, req.params.id, req.user.user_id, application.freelancer_id,
        agreed_price, commission, earnings, request.description, now
      );

      // Record escrow transaction
      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, ?, 'service_escrow', ?, 'debit', 'completed', ?, ?)`).run(
        uuidv4(), req.user.user_id, null, agreed_price, `ESCROW-${order_id.slice(0, 8)}`, now
      );

      // Accept this application, decline others
      db.prepare("UPDATE service_request_applications SET status = 'accepted' WHERE application_id = ?").run(req.params.appId);
      db.prepare("UPDATE service_request_applications SET status = 'declined' WHERE request_id = ? AND application_id != ?").run(req.params.id, req.params.appId);

      // Update request status
      db.prepare("UPDATE service_requests SET status = 'in_progress', updated_at = ? WHERE request_id = ?").run(now, req.params.id);

      return order_id;
    });

    const order_id = createOrder();
    res.json({ message: 'Application accepted, order created', order_id });
  } catch (err) {
    console.error('Accept application error:', err);
    res.status(500).json({ error: 'Failed to accept application' });
  }
});

module.exports = router;
