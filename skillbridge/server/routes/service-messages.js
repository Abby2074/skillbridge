const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/service-messages/conversations - Get user's conversations
router.get('/conversations', authenticateToken, (req, res) => {
  try {
    // Get unique conversation partners with latest message
    const conversations = db.prepare(`
      SELECT
        CASE WHEN sm.sender_id = ? THEN sm.receiver_id ELSE sm.sender_id END as other_user_id,
        u.full_name as other_user_name, u.profile_photo_url as other_user_photo,
        sm.message_text as last_message, sm.sent_at as last_message_at,
        sm.gig_id, sm.request_id, sm.order_id,
        g.title as gig_title,
        sr.title as request_title,
        (SELECT COUNT(*) FROM service_messages sm2
         WHERE sm2.receiver_id = ? AND sm2.is_read = 0
         AND sm2.sender_id = CASE WHEN sm.sender_id = ? THEN sm.receiver_id ELSE sm.sender_id END) as unread_count
      FROM service_messages sm
      JOIN users u ON u.user_id = CASE WHEN sm.sender_id = ? THEN sm.receiver_id ELSE sm.sender_id END
      LEFT JOIN service_gigs g ON sm.gig_id = g.gig_id
      LEFT JOIN service_requests sr ON sm.request_id = sr.request_id
      WHERE (sm.sender_id = ? OR sm.receiver_id = ?)
      AND sm.sent_at = (
        SELECT MAX(sm3.sent_at) FROM service_messages sm3
        WHERE (sm3.sender_id = sm.sender_id AND sm3.receiver_id = sm.receiver_id)
           OR (sm3.sender_id = sm.receiver_id AND sm3.receiver_id = sm.sender_id)
      )
      GROUP BY other_user_id
      ORDER BY sm.sent_at DESC
    `).all(req.user.user_id, req.user.user_id, req.user.user_id, req.user.user_id, req.user.user_id, req.user.user_id);

    res.json(conversations);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/service-messages/unread/count - Get unread message count (MUST be before /:userId)
router.get('/unread/count', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM service_messages WHERE receiver_id = ? AND is_read = 0').get(req.user.user_id);
    res.json({ unread: result.count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// GET /api/service-messages/:userId - Get messages with a specific user
router.get('/:userId', authenticateToken, (req, res) => {
  try {
    const { gig_id, request_id, order_id } = req.query;

    let query = `
      SELECT sm.*, u.full_name as sender_name
      FROM service_messages sm
      JOIN users u ON sm.sender_id = u.user_id
      WHERE ((sm.sender_id = ? AND sm.receiver_id = ?) OR (sm.sender_id = ? AND sm.receiver_id = ?))
    `;
    const params = [req.user.user_id, req.params.userId, req.params.userId, req.user.user_id];

    if (gig_id) { query += ` AND sm.gig_id = ?`; params.push(gig_id); }
    if (request_id) { query += ` AND sm.request_id = ?`; params.push(request_id); }
    if (order_id) { query += ` AND sm.order_id = ?`; params.push(order_id); }

    query += ` ORDER BY sm.sent_at ASC`;

    const messages = db.prepare(query).all(...params);

    // Mark as read
    db.prepare(`UPDATE service_messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0`).run(req.user.user_id, req.params.userId);

    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/service-messages - Send a message
router.post('/', authenticateToken, [
  body('receiver_id').trim().notEmpty().withMessage('Receiver is required'),
  body('message_text').trim().notEmpty().withMessage('Message is required'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { receiver_id, message_text, gig_id, request_id, order_id } = req.body;

    if (receiver_id === req.user.user_id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    // Verify receiver exists
    const receiver = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(receiver_id);
    if (!receiver) return res.status(404).json({ error: 'User not found' });

    const message_id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO service_messages (message_id, sender_id, receiver_id, gig_id, request_id, order_id, message_text, sent_at, is_read)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(
      message_id, req.user.user_id, receiver_id,
      gig_id || null, request_id || null, order_id || null,
      message_text, now
    );

    res.status(201).json({ message: 'Message sent', message_id });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
