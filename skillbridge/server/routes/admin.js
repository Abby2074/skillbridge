const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/admin/dashboard
router.get('/dashboard', authenticateToken, requireAdmin, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').get();
    const activeTutors = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('tutor','both') AND is_active = 1").get();
    const activeStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('student','both') AND is_active = 1").get();
    const totalSessions = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status IN ('completed','rated')").get();
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(session_fee), 0) as total FROM bookings WHERE status IN ('completed','rated')").get();
    const commissionEarned = db.prepare("SELECT COALESCE(SUM(platform_commission), 0) as total FROM bookings WHERE status IN ('completed','rated')").get();
    const pendingBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'requested'").get();

    const topTutors = db.prepare(`
      SELECT u.user_id, u.full_name, u.institution,
        COUNT(DISTINCT b.booking_id) as sessions,
        COALESCE(SUM(b.tutor_earnings), 0) as total_earnings,
        COALESCE(AVG(r.star_rating), 0) as avg_rating
      FROM users u
      LEFT JOIN bookings b ON u.user_id = b.tutor_id AND b.status IN ('completed','rated')
      LEFT JOIN reviews r ON u.user_id = r.tutor_id
      WHERE u.role IN ('tutor','both')
      GROUP BY u.user_id
      ORDER BY total_earnings DESC LIMIT 5
    `).all();

    const recentTransactions = db.prepare(`
      SELECT t.*, u.full_name as user_name
      FROM transactions t JOIN users u ON t.user_id = u.user_id
      ORDER BY t.created_at DESC LIMIT 20
    `).all();

    // Monthly revenue data for charts
    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', completed_at) as month,
        SUM(session_fee) as revenue,
        SUM(platform_commission) as commission,
        COUNT(*) as sessions
      FROM bookings
      WHERE status IN ('completed','rated') AND completed_at IS NOT NULL
      GROUP BY strftime('%Y-%m', completed_at)
      ORDER BY month ASC
    `).all();

    res.json({
      stats: {
        total_users: totalUsers.count,
        active_tutors: activeTutors.count,
        active_students: activeStudents.count,
        total_sessions: totalSessions.count,
        total_revenue: totalRevenue.total,
        commission_earned: commissionEarned.total,
        pending_bookings: pendingBookings.count,
      },
      top_tutors: topTutors,
      recent_transactions: recentTransactions,
      monthly_revenue: monthlyRevenue,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// GET /api/admin/users
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `SELECT user_id, full_name, email, role, institution, programme, wallet_balance, earnings_balance, is_active, is_admin, created_at, last_login_at FROM users WHERE is_admin = 0`;
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (search) {
      query += ' AND (full_name LIKE ? OR email LIKE ? OR institution LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countQuery = query.replace('SELECT user_id, full_name, email, role, institution, programme, wallet_balance, earnings_balance, is_active, is_admin, created_at, last_login_at', 'SELECT COUNT(*) as total');
    const total = db.prepare(countQuery).get(...params);

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const users = db.prepare(query).all(...params);

    // Get session counts for each user
    const usersWithStats = users.map(u => {
      const sessions = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE (student_id = ? OR tutor_id = ?) AND status IN ('completed','rated')").get(u.user_id, u.user_id);
      return { ...u, session_count: sessions.count };
    });

    res.json({ users: usersWithStats, total: total.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// PUT /api/admin/users/:userId/suspend
router.put('/users/:userId/suspend', authenticateToken, requireAdmin, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.is_admin) return res.status(400).json({ error: 'Cannot suspend admin' });

    const newStatus = user.is_active ? 0 : 1;
    db.prepare('UPDATE users SET is_active = ? WHERE user_id = ?').run(newStatus, req.params.userId);

    res.json({ message: newStatus ? 'User activated' : 'User suspended', is_active: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// GET /api/admin/tutors/inventory
router.get('/tutors/inventory', authenticateToken, requireAdmin, (req, res) => {
  try {
    const inventory = db.prepare(`
      SELECT s.skill_id, s.skill_name, s.category,
        COUNT(DISTINCT CASE WHEN sl.status = 'active' THEN sl.listing_id END) as active_listings,
        COUNT(DISTINCT CASE WHEN b.status IN ('completed','rated') THEN b.booking_id END) as total_sessions
      FROM skills s
      LEFT JOIN session_listings sl ON s.skill_id = sl.skill_id
      LEFT JOIN bookings b ON sl.listing_id = b.listing_id
      WHERE s.is_active = 1
      GROUP BY s.skill_id
      ORDER BY s.skill_name
    `).all();

    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

// GET /api/admin/orders
router.get('/orders', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT b.*, sl.title, s.skill_name,
        tu.full_name as tutor_name, su.full_name as student_name
      FROM bookings b
      JOIN session_listings sl ON b.listing_id = sl.listing_id
      JOIN skills s ON sl.skill_id = s.skill_id
      JOIN users tu ON b.tutor_id = tu.user_id
      JOIN users su ON b.student_id = su.user_id
    `;
    const params = [];

    if (status) {
      query += ' WHERE b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.requested_at DESC';

    const orders = db.prepare(query).all(...params);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// GET /api/admin/reports/financial
router.get('/reports/financial', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = ' AND t.created_at BETWEEN ? AND ?';
      params.push(start_date, end_date + 'T23:59:59Z');
    }

    const transactions = db.prepare(`
      SELECT t.*, u.full_name as user_name
      FROM transactions t JOIN users u ON t.user_id = u.user_id
      WHERE 1=1 ${dateFilter}
      ORDER BY t.created_at DESC
    `).all(...params);

    const summary = db.prepare(`
      SELECT
        transaction_type,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM transactions WHERE 1=1 ${dateFilter}
      GROUP BY transaction_type
    `).all(...params);

    res.json({ transactions, summary });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get financial report' });
  }
});

// GET /api/admin/reports/financial/csv
router.get('/reports/financial/csv', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = ' AND t.created_at BETWEEN ? AND ?';
      params.push(start_date, end_date + 'T23:59:59Z');
    }

    const transactions = db.prepare(`
      SELECT t.transaction_id, u.full_name as user_name, u.email, t.transaction_type, t.amount, t.direction, t.status, t.payment_reference, t.created_at
      FROM transactions t JOIN users u ON t.user_id = u.user_id
      WHERE 1=1 ${dateFilter}
      ORDER BY t.created_at DESC
    `).all(...params);

    const headers = 'Transaction ID,User,Email,Type,Amount (GHS),Direction,Status,Reference,Date\n';
    const rows = transactions.map(t =>
      `${t.transaction_id},"${t.user_name}",${t.email},${t.transaction_type},${t.amount},${t.direction},${t.status},${t.payment_reference || ''},${t.created_at}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=skillbridge-financial-report.csv');
    res.send(headers + rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
});

// GET /api/admin/partners
router.get('/partners', authenticateToken, requireAdmin, (req, res) => {
  try {
    const partners = db.prepare(`
      SELECT u.institution,
        COUNT(DISTINCT u.user_id) as user_count,
        COUNT(DISTINCT CASE WHEN u.role IN ('tutor','both') THEN u.user_id END) as tutor_count,
        COUNT(DISTINCT CASE WHEN u.role IN ('student','both') THEN u.user_id END) as student_count,
        COUNT(DISTINCT CASE WHEN b.status IN ('completed','rated') THEN b.booking_id END) as sessions
      FROM users u
      LEFT JOIN bookings b ON (u.user_id = b.student_id OR u.user_id = b.tutor_id)
      WHERE u.is_admin = 0
      GROUP BY u.institution
      ORDER BY user_count DESC
    `).all();

    res.json(partners);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get partners' });
  }
});

module.exports = router;
