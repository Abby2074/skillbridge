const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/bookings
router.post('/', authenticateToken, [
  body('listing_id').notEmpty().withMessage('Listing is required'),
  body('availability_id').notEmpty().withMessage('Availability slot is required'),
  body('scheduled_date').notEmpty().withMessage('Scheduled date is required'),
  body('delivery_format').isIn(['online', 'in_person']).withMessage('Invalid delivery format'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { listing_id, availability_id, scheduled_date, delivery_format, learning_objectives } = req.body;

    const listing = db.prepare('SELECT * FROM session_listings WHERE listing_id = ? AND status = \'active\'').get(listing_id);
    if (!listing) return res.status(404).json({ error: 'Listing not found or inactive' });

    const slot = db.prepare('SELECT * FROM availability WHERE availability_id = ? AND is_booked = 0').get(availability_id);
    if (!slot) return res.status(400).json({ error: 'Time slot not available' });

    const student = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const session_fee = listing.hourly_rate;
    const platform_commission = Math.round(session_fee * 0.10 * 100) / 100;
    const tutor_earnings = Math.round(session_fee * 0.90 * 100) / 100;

    if (student.wallet_balance < session_fee) {
      return res.status(400).json({ error: 'Insufficient wallet balance', wallet_balance: student.wallet_balance, session_fee });
    }

    // Atomic transaction
    const booking_id = uuidv4();
    const now = new Date().toISOString();

    const createBooking = db.transaction(() => {
      // Deduct from student wallet
      db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE user_id = ?').run(session_fee, req.user.user_id);

      // Mark slot as booked
      db.prepare('UPDATE availability SET is_booked = 1 WHERE availability_id = ?').run(availability_id);

      // Create booking
      db.prepare(`INSERT INTO bookings (booking_id, student_id, tutor_id, listing_id, availability_id, scheduled_date, delivery_format, learning_objectives, session_fee, platform_commission, tutor_earnings, status, requested_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?)`).run(
        booking_id, req.user.user_id, listing.tutor_id, listing_id, availability_id,
        scheduled_date, delivery_format, learning_objectives || null,
        session_fee, platform_commission, tutor_earnings, now
      );

      // Create student payment transaction
      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, ?, 'session_payment', ?, 'debit', 'completed', ?, ?)`).run(
        uuidv4(), req.user.user_id, booking_id, session_fee, `PAY-${booking_id.slice(0, 8)}`, now
      );
    });

    createBooking();

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(booking_id);
    res.status(201).json(booking);
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// GET /api/bookings
router.get('/', authenticateToken, (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT b.*, sl.title, s.skill_name,
        tu.full_name as tutor_name, su.full_name as student_name,
        tu.profile_photo_url as tutor_photo
      FROM bookings b
      JOIN session_listings sl ON b.listing_id = sl.listing_id
      JOIN skills s ON sl.skill_id = s.skill_id
      JOIN users tu ON b.tutor_id = tu.user_id
      JOIN users su ON b.student_id = su.user_id
      WHERE (b.student_id = ? OR b.tutor_id = ?)
    `;
    const params = [req.user.user_id, req.user.user_id];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.requested_at DESC';

    const bookings = db.prepare(query).all(...params);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// GET /api/bookings/:bookingId
router.get('/:bookingId', authenticateToken, (req, res) => {
  try {
    const booking = db.prepare(`
      SELECT b.*, sl.title, sl.description as listing_description, s.skill_name,
        tu.full_name as tutor_name, tu.email as tutor_email, tu.profile_photo_url as tutor_photo,
        su.full_name as student_name, su.email as student_email
      FROM bookings b
      JOIN session_listings sl ON b.listing_id = sl.listing_id
      JOIN skills s ON sl.skill_id = s.skill_id
      JOIN users tu ON b.tutor_id = tu.user_id
      JOIN users su ON b.student_id = su.user_id
      WHERE b.booking_id = ? AND (b.student_id = ? OR b.tutor_id = ? OR ? = 1)
    `).get(req.params.bookingId, req.user.user_id, req.user.user_id, req.user.is_admin ? 1 : 0);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Get messages for this booking
    const messages = db.prepare(`
      SELECT m.*, u.full_name as sender_name
      FROM messages m JOIN users u ON m.sender_id = u.user_id
      WHERE m.booking_id = ? ORDER BY m.sent_at ASC
    `).all(req.params.bookingId);

    // Check if review exists
    const review = db.prepare('SELECT * FROM reviews WHERE booking_id = ?').get(req.params.bookingId);

    res.json({ ...booking, messages, review });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get booking' });
  }
});

// PUT /api/bookings/:bookingId/accept
router.put('/:bookingId/accept', authenticateToken, (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ? AND tutor_id = ?').get(req.params.bookingId, req.user.user_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'requested') return res.status(400).json({ error: 'Booking cannot be accepted in current state' });

    const now = new Date().toISOString();
    const onlineLink = `https://meet.skillbridge.gh/${req.params.bookingId.slice(0, 8)}`;

    db.prepare("UPDATE bookings SET status = 'confirmed', confirmed_at = ?, online_link = ? WHERE booking_id = ?").run(now, onlineLink, req.params.bookingId);

    res.json({ message: 'Booking confirmed', online_link: onlineLink });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept booking' });
  }
});

// PUT /api/bookings/:bookingId/decline
router.put('/:bookingId/decline', authenticateToken, (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ? AND tutor_id = ?').get(req.params.bookingId, req.user.user_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'requested') return res.status(400).json({ error: 'Booking cannot be declined in current state' });

    const now = new Date().toISOString();

    const declineBooking = db.transaction(() => {
      db.prepare("UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?").run(req.params.bookingId);
      db.prepare('UPDATE availability SET is_booked = 0 WHERE availability_id = ?').run(booking.availability_id);
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?').run(booking.session_fee, booking.student_id);

      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, ?, 'refund', ?, 'credit', 'completed', ?, ?)`).run(
        uuidv4(), booking.student_id, req.params.bookingId, booking.session_fee, `REF-${req.params.bookingId.slice(0, 8)}`, now
      );
    });

    declineBooking();
    res.json({ message: 'Booking declined and student refunded' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline booking' });
  }
});

// PUT /api/bookings/:bookingId/complete
router.put('/:bookingId/complete', authenticateToken, (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ? AND (tutor_id = ? OR student_id = ?)').get(req.params.bookingId, req.user.user_id, req.user.user_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
      return res.status(400).json({ error: 'Booking cannot be completed in current state' });
    }

    const now = new Date().toISOString();

    const completeBooking = db.transaction(() => {
      db.prepare("UPDATE bookings SET status = 'completed', completed_at = ? WHERE booking_id = ?").run(now, req.params.bookingId);

      // Credit tutor earnings
      db.prepare('UPDATE users SET earnings_balance = earnings_balance + ? WHERE user_id = ?').run(booking.tutor_earnings, booking.tutor_id);

      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, ?, 'tutor_earnings', ?, 'credit', 'completed', ?, ?)`).run(
        uuidv4(), booking.tutor_id, req.params.bookingId, booking.tutor_earnings, `EARN-${req.params.bookingId.slice(0, 8)}`, now
      );

      // Record commission
      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, ?, 'commission', ?, 'credit', 'completed', ?, ?)`).run(
        uuidv4(), booking.tutor_id, req.params.bookingId, booking.platform_commission, `COM-${req.params.bookingId.slice(0, 8)}`, now
      );
    });

    completeBooking();
    res.json({ message: 'Session completed. Tutor has been credited.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete booking' });
  }
});

// PUT /api/bookings/:bookingId/cancel
router.put('/:bookingId/cancel', authenticateToken, (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ? AND (student_id = ? OR tutor_id = ?)').get(req.params.bookingId, req.user.user_id, req.user.user_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!['requested', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ error: 'Booking cannot be cancelled in current state' });
    }

    const now = new Date().toISOString();
    const scheduledTime = new Date(booking.scheduled_date).getTime();
    const currentTime = new Date().getTime();
    const hoursUntilSession = (scheduledTime - currentTime) / (1000 * 60 * 60);

    // Full refund if more than 24 hours before session
    const refundAmount = hoursUntilSession > 24 ? booking.session_fee : Math.round(booking.session_fee * 0.50 * 100) / 100;

    const cancelBooking = db.transaction(() => {
      db.prepare("UPDATE bookings SET status = 'cancelled' WHERE booking_id = ?").run(req.params.bookingId);
      db.prepare('UPDATE availability SET is_booked = 0 WHERE availability_id = ?').run(booking.availability_id);
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?').run(refundAmount, booking.student_id);

      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, ?, 'refund', ?, 'credit', 'completed', ?, ?)`).run(
        uuidv4(), booking.student_id, req.params.bookingId, refundAmount, `REF-${req.params.bookingId.slice(0, 8)}`, now
      );
    });

    cancelBooking();
    res.json({ message: 'Booking cancelled', refund_amount: refundAmount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// POST /api/bookings/:bookingId/message
router.post('/:bookingId/message', authenticateToken, [
  body('message_text').trim().notEmpty().withMessage('Message is required'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ? AND (student_id = ? OR tutor_id = ?)').get(req.params.bookingId, req.user.user_id, req.user.user_id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const message_id = uuidv4();
    db.prepare('INSERT INTO messages (message_id, booking_id, sender_id, message_text, sent_at) VALUES (?, ?, ?, ?, ?)').run(
      message_id, req.params.bookingId, req.user.user_id, req.body.message_text, new Date().toISOString()
    );

    const message = db.prepare('SELECT m.*, u.full_name as sender_name FROM messages m JOIN users u ON m.sender_id = u.user_id WHERE m.message_id = ?').get(message_id);
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
