const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// POST /api/reviews
router.post('/', authenticateToken, [
  body('booking_id').notEmpty().withMessage('Booking ID is required'),
  body('star_rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('review_text').optional().trim(),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { booking_id, star_rating, review_text } = req.body;

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ? AND student_id = ?').get(booking_id, req.user.user_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Can only review completed sessions' });

    const existing = db.prepare('SELECT review_id FROM reviews WHERE booking_id = ?').get(booking_id);
    if (existing) return res.status(409).json({ error: 'Already reviewed this session' });

    const review_id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO reviews (review_id, booking_id, student_id, tutor_id, star_rating, review_text, is_flagged, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)`).run(
      review_id, booking_id, req.user.user_id, booking.tutor_id, star_rating, review_text || null, now
    );

    // Update booking status to rated
    db.prepare("UPDATE bookings SET status = 'rated' WHERE booking_id = ?").run(booking_id);

    res.status(201).json({ review_id, message: 'Review submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /api/reviews/tutor/:tutorId
router.get('/tutor/:tutorId', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.full_name as student_name
      FROM reviews r JOIN users u ON r.student_id = u.user_id
      WHERE r.tutor_id = ? AND r.is_flagged = 0
      ORDER BY r.created_at DESC
    `).all(req.params.tutorId);

    const stats = db.prepare(`
      SELECT COUNT(*) as total, COALESCE(AVG(star_rating), 0) as average,
        SUM(CASE WHEN star_rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN star_rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN star_rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN star_rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN star_rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM reviews WHERE tutor_id = ?
    `).get(req.params.tutorId);

    res.json({ reviews, stats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// GET /api/reviews/admin (admin only)
router.get('/admin', authenticateToken, requireAdmin, (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.full_name as student_name, tu.full_name as tutor_name
      FROM reviews r
      JOIN users u ON r.student_id = u.user_id
      JOIN users tu ON r.tutor_id = tu.user_id
      ORDER BY r.created_at DESC
    `).all();

    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// PUT /api/reviews/:reviewId/flag (admin)
router.put('/:reviewId/flag', authenticateToken, requireAdmin, (req, res) => {
  try {
    const review = db.prepare('SELECT * FROM reviews WHERE review_id = ?').get(req.params.reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const newFlag = review.is_flagged ? 0 : 1;
    db.prepare('UPDATE reviews SET is_flagged = ? WHERE review_id = ?').run(newFlag, req.params.reviewId);

    res.json({ message: newFlag ? 'Review flagged' : 'Review unflagged' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to flag review' });
  }
});

module.exports = router;
