const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Helper: get platform admin account for commission tracking
function getPlatformAdminId() {
  const admin = db.prepare('SELECT user_id FROM users WHERE is_admin = 1 LIMIT 1').get();
  return admin ? admin.user_id : null;
}

// GET /api/service-orders - Get current user's orders
router.get('/', authenticateToken, (req, res) => {
  try {
    const { role } = req.query; // 'buyer' or 'freelancer'

    let query = `
      SELECT so.*,
        buyer.full_name as buyer_name, buyer.profile_photo_url as buyer_photo,
        freelancer.full_name as freelancer_name, freelancer.profile_photo_url as freelancer_photo,
        g.title as gig_title,
        sr.title as request_title,
        sc_g.category_name as gig_category,
        sc_r.category_name as request_category
      FROM service_orders so
      JOIN users buyer ON so.buyer_id = buyer.user_id
      JOIN users freelancer ON so.freelancer_id = freelancer.user_id
      LEFT JOIN service_gigs g ON so.gig_id = g.gig_id
      LEFT JOIN service_requests sr ON so.request_id = sr.request_id
      LEFT JOIN service_categories sc_g ON g.category_id = sc_g.category_id
      LEFT JOIN service_categories sc_r ON sr.category_id = sc_r.category_id
      WHERE (so.buyer_id = ? OR so.freelancer_id = ?)
    `;
    const params = [req.user.user_id, req.user.user_id];

    if (role === 'buyer') {
      query = query.replace('(so.buyer_id = ? OR so.freelancer_id = ?)', 'so.buyer_id = ?');
      params.splice(1, 1);
    } else if (role === 'freelancer') {
      query = query.replace('(so.buyer_id = ? OR so.freelancer_id = ?)', 'so.freelancer_id = ?');
      params.splice(0, 1);
    }

    query += ` ORDER BY so.created_at DESC`;

    const orders = db.prepare(query).all(...params);
    res.json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/service-orders/:id - Get order detail
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const order = db.prepare(`
      SELECT so.*,
        buyer.full_name as buyer_name, buyer.profile_photo_url as buyer_photo, buyer.email as buyer_email,
        freelancer.full_name as freelancer_name, freelancer.profile_photo_url as freelancer_photo, freelancer.email as freelancer_email,
        g.title as gig_title, g.description as gig_description,
        sr.title as request_title, sr.description as request_description
      FROM service_orders so
      JOIN users buyer ON so.buyer_id = buyer.user_id
      JOIN users freelancer ON so.freelancer_id = freelancer.user_id
      LEFT JOIN service_gigs g ON so.gig_id = g.gig_id
      LEFT JOIN service_requests sr ON so.request_id = sr.request_id
      WHERE so.order_id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.buyer_id !== req.user.user_id && order.freelancer_id !== req.user.user_id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get messages for this order
    const messages = db.prepare(`
      SELECT sm.*, u.full_name as sender_name
      FROM service_messages sm
      JOIN users u ON sm.sender_id = u.user_id
      WHERE sm.order_id = ?
      ORDER BY sm.sent_at ASC
    `).all(req.params.id);

    res.json({ ...order, messages });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/service-orders - Create order from gig (direct purchase after negotiation)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { gig_id, agreed_price, description } = req.body;

    if (!gig_id || !agreed_price) {
      return res.status(400).json({ error: 'gig_id and agreed_price are required' });
    }

    const gig = db.prepare('SELECT * FROM service_gigs WHERE gig_id = ?').get(gig_id);
    if (!gig) return res.status(404).json({ error: 'Gig not found' });
    if (gig.status !== 'active') return res.status(400).json({ error: 'This gig is not available' });
    if (gig.freelancer_id === req.user.user_id) return res.status(400).json({ error: 'Cannot order your own gig' });

    const price = parseFloat(agreed_price);
    if (isNaN(price) || price < 1) {
      return res.status(400).json({ error: 'Price must be at least 1' });
    }
    const commission = Math.round(price * 0.10 * 100) / 100;
    const earnings = Math.round(price * 0.90 * 100) / 100;

    const now = new Date().toISOString();

    const createOrder = db.transaction(() => {
      // Check buyer balance inside transaction to prevent race conditions
      const buyer = db.prepare('SELECT wallet_balance FROM users WHERE user_id = ?').get(req.user.user_id);
      if (buyer.wallet_balance < price) throw new Error('INSUFFICIENT_BALANCE');

      // Deduct from buyer (escrow)
      db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?').run(price, req.user.user_id);

      const order_id = uuidv4();
      db.prepare(`INSERT INTO service_orders (order_id, gig_id, buyer_id, freelancer_id, agreed_price, platform_commission, freelancer_earnings, description, status, escrow_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', 'held', ?)`).run(
        order_id, gig_id, req.user.user_id, gig.freelancer_id,
        price, commission, earnings, description || gig.description, now
      );

      // Record escrow transaction
      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, ?, 'service_escrow', ?, 'debit', 'completed', ?, ?)`).run(
        uuidv4(), req.user.user_id, null, price, `ESCROW-${order_id.slice(0, 8)}`, now
      );

      return order_id;
    });

    try {
      const order_id = createOrder();
      res.status(201).json({ message: 'Order created, funds held in escrow', order_id });
    } catch (txErr) {
      if (txErr.message === 'INSUFFICIENT_BALANCE') return res.status(400).json({ error: 'Insufficient wallet balance. Please top up.' });
      throw txErr;
    }
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/service-orders/:id/deliver - Freelancer marks as delivered
router.put('/:id/deliver', authenticateToken, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM service_orders WHERE order_id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.freelancer_id !== req.user.user_id) return res.status(403).json({ error: 'Not your order' });
    if (order.status !== 'in_progress') return res.status(400).json({ error: 'Order is not in progress' });

    const now = new Date().toISOString();
    db.prepare("UPDATE service_orders SET status = 'delivered', freelancer_confirmed = 1, delivered_at = ? WHERE order_id = ?").run(now, req.params.id);

    res.json({ message: 'Order marked as delivered. Waiting for buyer confirmation.' });
  } catch (err) {
    console.error('Deliver order error:', err);
    res.status(500).json({ error: 'Failed to deliver order' });
  }
});

// PUT /api/service-orders/:id/confirm - Buyer confirms completion
router.put('/:id/confirm', authenticateToken, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM service_orders WHERE order_id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.buyer_id !== req.user.user_id) return res.status(403).json({ error: 'Not your order' });
    if (order.status !== 'delivered') return res.status(400).json({ error: 'Order has not been delivered yet' });

    const now = new Date().toISOString();

    const completeOrder = db.transaction(() => {
      // Update order
      db.prepare("UPDATE service_orders SET status = 'completed', buyer_confirmed = 1, escrow_status = 'released', completed_at = ? WHERE order_id = ?").run(now, req.params.id);

      // Release earnings to freelancer
      db.prepare('UPDATE users SET earnings_balance = earnings_balance + ? WHERE user_id = ?').run(order.freelancer_earnings, order.freelancer_id);

      // Record transactions
      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, ?, 'service_earnings', ?, 'credit', 'completed', ?, ?)`).run(
        uuidv4(), order.freelancer_id, null, order.freelancer_earnings, `SVCPAY-${order.order_id.slice(0, 8)}`, now
      );

      // Record commission to platform admin account
      const platformAdminId = getPlatformAdminId();
      if (platformAdminId) {
        db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
          VALUES (?, ?, ?, 'service_commission', ?, 'credit', 'completed', ?, ?)`).run(
          uuidv4(), platformAdminId, null, order.platform_commission, `SVCCOM-${order.order_id.slice(0, 8)}`, now
        );
      }

      // If this order came from a service request, mark it completed
      if (order.request_id) {
        db.prepare("UPDATE service_requests SET status = 'completed', updated_at = ? WHERE request_id = ?").run(now, order.request_id);
      }
    });

    completeOrder();
    res.json({ message: 'Order completed! Freelancer has been paid.' });
  } catch (err) {
    console.error('Confirm order error:', err);
    res.status(500).json({ error: 'Failed to confirm order' });
  }
});

// PUT /api/service-orders/:id/cancel - Cancel an order
router.put('/:id/cancel', authenticateToken, (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM service_orders WHERE order_id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.buyer_id !== req.user.user_id && order.freelancer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Not your order' });
    }
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    const now = new Date().toISOString();

    const cancelOrder = db.transaction(() => {
      // Refund buyer
      if (order.escrow_status === 'held') {
        db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?').run(order.agreed_price, order.buyer_id);

        db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
          VALUES (?, ?, ?, 'refund', ?, 'credit', 'completed', ?, ?)`).run(
          uuidv4(), order.buyer_id, null, order.agreed_price, `REFUND-${order.order_id.slice(0, 8)}`, now
        );
      }

      db.prepare("UPDATE service_orders SET status = 'cancelled', escrow_status = 'refunded' WHERE order_id = ?").run(req.params.id);
    });

    cancelOrder();
    res.json({ message: 'Order cancelled, buyer refunded.' });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

module.exports = router;
