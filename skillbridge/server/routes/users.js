const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/users/profile/:userId
router.get('/profile/:userId', (req, res) => {
  try {
    const user = db.prepare(`SELECT user_id, full_name, email, role, institution, programme, year_of_study, bio, profile_photo_url, created_at FROM users WHERE user_id = ? AND is_active = 1`).get(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get listings
    const listings = db.prepare(`SELECT sl.*, s.skill_name, s.category FROM session_listings sl JOIN skills s ON sl.skill_id = s.skill_id WHERE sl.tutor_id = ? AND sl.status = 'active'`).all(req.params.userId);

    // Get review stats
    const reviewStats = db.prepare(`SELECT COUNT(*) as review_count, COALESCE(AVG(star_rating), 0) as avg_rating FROM reviews WHERE tutor_id = ?`).get(req.params.userId);

    // Get session count
    const sessionCount = db.prepare(`SELECT COUNT(*) as count FROM bookings WHERE tutor_id = ? AND status IN ('completed', 'rated')`).get(req.params.userId);

    // Get reviews
    const reviews = db.prepare(`SELECT r.*, u.full_name as student_name FROM reviews r JOIN users u ON r.student_id = u.user_id WHERE r.tutor_id = ? ORDER BY r.created_at DESC`).all(req.params.userId);

    res.json({
      ...user,
      listings,
      avg_rating: Math.round(reviewStats.avg_rating * 10) / 10,
      review_count: reviewStats.review_count,
      session_count: sessionCount.count,
      reviews
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticateToken, [
  body('full_name').optional().trim().notEmpty(),
  body('bio').optional().trim(),
  body('institution').optional().trim().notEmpty(),
  body('programme').optional().trim(),
  body('year_of_study').optional().isInt({ min: 1, max: 7 }),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, bio, institution, programme, year_of_study } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare(`UPDATE users SET full_name = ?, bio = ?, institution = ?, programme = ?, year_of_study = ? WHERE user_id = ?`).run(
      full_name || user.full_name,
      bio !== undefined ? bio : user.bio,
      institution || user.institution,
      programme !== undefined ? programme : user.programme,
      year_of_study || user.year_of_study,
      req.user.user_id
    );

    const updated = db.prepare('SELECT user_id, full_name, email, role, institution, programme, year_of_study, bio, profile_photo_url, wallet_balance, earnings_balance, is_verified, is_active, is_admin, created_at FROM users WHERE user_id = ?').get(req.user.user_id);

    res.json(updated);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/tutors
router.get('/tutors', (req, res) => {
  try {
    const { skill_id, min_rating, max_rate, delivery_format, sort, search } = req.query;

    let query = `
      SELECT u.user_id, u.full_name, u.institution, u.bio, u.profile_photo_url,
        sl.listing_id, sl.title, sl.hourly_rate, sl.delivery_format, sl.description,
        s.skill_name, s.category, s.skill_id,
        COALESCE(AVG(r.star_rating), 0) as avg_rating,
        COUNT(DISTINCT r.review_id) as review_count,
        COUNT(DISTINCT CASE WHEN b.status IN ('completed','rated') THEN b.booking_id END) as session_count
      FROM users u
      JOIN session_listings sl ON u.user_id = sl.tutor_id AND sl.status = 'active'
      JOIN skills s ON sl.skill_id = s.skill_id
      LEFT JOIN reviews r ON u.user_id = r.tutor_id
      LEFT JOIN bookings b ON u.user_id = b.tutor_id
      WHERE u.is_active = 1 AND u.role IN ('tutor', 'both')
    `;

    const params = [];

    if (skill_id) {
      query += ' AND s.skill_id = ?';
      params.push(skill_id);
    }
    if (max_rate) {
      query += ' AND sl.hourly_rate <= ?';
      params.push(parseFloat(max_rate));
    }
    if (delivery_format && delivery_format !== 'all') {
      query += ' AND (sl.delivery_format = ? OR sl.delivery_format = \'both\')';
      params.push(delivery_format);
    }
    if (search) {
      query += ' AND (u.full_name LIKE ? OR s.skill_name LIKE ? OR sl.title LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' GROUP BY sl.listing_id';

    if (min_rating) {
      query += ' HAVING avg_rating >= ?';
      params.push(parseFloat(min_rating));
    }

    if (sort === 'price_low') {
      query += ' ORDER BY sl.hourly_rate ASC';
    } else if (sort === 'price_high') {
      query += ' ORDER BY sl.hourly_rate DESC';
    } else if (sort === 'rating') {
      query += ' ORDER BY avg_rating DESC';
    } else if (sort === 'sessions') {
      query += ' ORDER BY session_count DESC';
    } else {
      query += ' ORDER BY avg_rating DESC, session_count DESC';
    }

    const tutors = db.prepare(query).all(...params);

    res.json(tutors);
  } catch (err) {
    console.error('Get tutors error:', err);
    res.status(500).json({ error: 'Failed to get tutors' });
  }
});

// GET /api/users/dashboard
router.get('/dashboard', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const upcomingBookings = db.prepare(`
      SELECT b.*, sl.title, s.skill_name,
        CASE WHEN b.student_id = ? THEN tu.full_name ELSE su.full_name END as other_party_name
      FROM bookings b
      JOIN session_listings sl ON b.listing_id = sl.listing_id
      JOIN skills s ON sl.skill_id = s.skill_id
      JOIN users tu ON b.tutor_id = tu.user_id
      JOIN users su ON b.student_id = su.user_id
      WHERE (b.student_id = ? OR b.tutor_id = ?)
        AND b.status IN ('requested', 'confirmed', 'in_progress')
      ORDER BY b.scheduled_date ASC
    `).all(req.user.user_id, req.user.user_id, req.user.user_id);

    const recentBookings = db.prepare(`
      SELECT b.*, sl.title, s.skill_name,
        CASE WHEN b.student_id = ? THEN tu.full_name ELSE su.full_name END as other_party_name
      FROM bookings b
      JOIN session_listings sl ON b.listing_id = sl.listing_id
      JOIN skills s ON sl.skill_id = s.skill_id
      JOIN users tu ON b.tutor_id = tu.user_id
      JOIN users su ON b.student_id = su.user_id
      WHERE (b.student_id = ? OR b.tutor_id = ?)
      ORDER BY b.requested_at DESC LIMIT 10
    `).all(req.user.user_id, req.user.user_id, req.user.user_id);

    const recentTransactions = db.prepare(`
      SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(req.user.user_id);

    // Tutor-specific stats
    let tutorStats = null;
    if (user.role === 'tutor' || user.role === 'both') {
      const listings = db.prepare('SELECT COUNT(*) as count FROM session_listings WHERE tutor_id = ? AND status = \'active\'').get(req.user.user_id);
      const reviewStats = db.prepare('SELECT COUNT(*) as count, COALESCE(AVG(star_rating), 0) as avg FROM reviews WHERE tutor_id = ?').get(req.user.user_id);
      const totalSessions = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE tutor_id = ? AND status IN (\'completed\', \'rated\')').get(req.user.user_id);

      tutorStats = {
        active_listings: listings.count,
        avg_rating: Math.round(reviewStats.avg * 10) / 10,
        review_count: reviewStats.count,
        total_sessions: totalSessions.count,
      };
    }

    res.json({
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        institution: user.institution,
        wallet_balance: user.wallet_balance,
        earnings_balance: user.earnings_balance,
        is_admin: user.is_admin,
      },
      upcoming_bookings: upcomingBookings,
      recent_bookings: recentBookings,
      recent_transactions: recentTransactions,
      tutor_stats: tutorStats,
    });
  } catch (err) {
    console.error('Get dashboard error:', err);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// GET /api/users/stats (public stats for homepage)
router.get('/stats', (req, res) => {
  try {
    const tutorCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('tutor','both') AND is_active = 1").get();
    const studentCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('student','both') AND is_active = 1").get();
    const sessionCount = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status IN ('completed','rated')").get();

    res.json({
      tutors: tutorCount.count,
      students: studentCount.count,
      sessions: sessionCount.count,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
