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
      SELECT t.*, COALESCE(u.full_name, 'Platform') as user_name
      FROM transactions t LEFT JOIN users u ON t.user_id = u.user_id
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

    // Service Marketplace stats
    const totalGigs = db.prepare("SELECT COUNT(*) as count FROM service_gigs WHERE status = 'active'").get();
    const totalServiceRequests = db.prepare("SELECT COUNT(*) as count FROM service_requests WHERE status = 'open'").get();
    const totalServiceOrders = db.prepare("SELECT COUNT(*) as count FROM service_orders").get();
    const completedServiceOrders = db.prepare("SELECT COUNT(*) as count FROM service_orders WHERE status = 'completed'").get();
    const serviceRevenue = db.prepare("SELECT COALESCE(SUM(agreed_price), 0) as total FROM service_orders WHERE status = 'completed'").get();
    const serviceCommission = db.prepare("SELECT COALESCE(SUM(platform_commission), 0) as total FROM service_orders WHERE status = 'completed'").get();
    const pendingCategoryRequests = db.prepare("SELECT COUNT(*) as count FROM service_category_requests WHERE status = 'pending'").get();

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
      marketplace_stats: {
        active_gigs: totalGigs.count,
        open_requests: totalServiceRequests.count,
        total_service_orders: totalServiceOrders.count,
        completed_service_orders: completedServiceOrders.count,
        service_revenue: serviceRevenue.total,
        service_commission: serviceCommission.total,
        pending_category_requests: pendingCategoryRequests.count,
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
      SELECT t.*, COALESCE(u.full_name, 'Platform') as user_name
      FROM transactions t LEFT JOIN users u ON t.user_id = u.user_id
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
      SELECT t.transaction_id, COALESCE(u.full_name, 'Platform') as user_name, COALESCE(u.email, '') as email, t.transaction_type, t.amount, t.direction, t.status, t.payment_reference, t.created_at
      FROM transactions t LEFT JOIN users u ON t.user_id = u.user_id
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

// GET /api/admin/service-categories/requests - Get pending category requests
router.get('/service-categories/requests', authenticateToken, requireAdmin, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT scr.*, u.full_name as user_name, u.email
      FROM service_category_requests scr
      JOIN users u ON scr.user_id = u.user_id
      ORDER BY scr.submitted_at DESC
    `).all();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get category requests' });
  }
});

// PUT /api/admin/service-categories/requests/:id - Approve/decline category request
router.put('/service-categories/requests/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'declined'
    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or declined' });
    }

    const request = db.prepare('SELECT * FROM service_category_requests WHERE request_id = ?').get(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const now = new Date().toISOString();
    db.prepare('UPDATE service_category_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE request_id = ?').run(status, req.user.user_id, now, req.params.id);

    // If approved, create the category
    if (status === 'approved') {
      const { v4: uuidv4 } = require('uuid');
      db.prepare('INSERT INTO service_categories (category_id, category_name, description, is_active, created_at) VALUES (?, ?, ?, 1, ?)').run(
        uuidv4(), request.category_name, request.description, now
      );
    }

    res.json({ message: `Category request ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category request' });
  }
});

// GET /api/admin/service-orders - Get all service orders
router.get('/service-orders', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT so.*, buyer.full_name as buyer_name, freelancer.full_name as freelancer_name,
        g.title as gig_title, sr.title as request_title
      FROM service_orders so
      JOIN users buyer ON so.buyer_id = buyer.user_id
      JOIN users freelancer ON so.freelancer_id = freelancer.user_id
      LEFT JOIN service_gigs g ON so.gig_id = g.gig_id
      LEFT JOIN service_requests sr ON so.request_id = sr.request_id
    `;
    const params = [];
    if (status) { query += ' WHERE so.status = ?'; params.push(status); }
    query += ' ORDER BY so.created_at DESC';

    const orders = db.prepare(query).all(...params);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get service orders' });
  }
});

// ========== CRM MODULE ==========

// GET /api/admin/crm/customers - Full customer database with activity stats
router.get('/crm/customers', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { search, sort = 'recent' } = req.query;
    let query = `
      SELECT u.user_id, u.full_name, u.email, u.role, u.institution, u.programme,
        u.wallet_balance, u.earnings_balance, u.is_active, u.created_at, u.last_login_at,
        COUNT(DISTINCT CASE WHEN b.status IN ('completed','rated') THEN b.booking_id END) as total_sessions,
        COUNT(DISTINCT CASE WHEN so.status = 'completed' THEN so.order_id END) as total_service_orders,
        COALESCE(SUM(CASE WHEN t.direction = 'debit' THEN t.amount ELSE 0 END), 0) as total_spent,
        COUNT(DISTINCT st.ticket_id) as support_tickets,
        COUNT(DISTINCT r.review_id) as reviews_given
      FROM users u
      LEFT JOIN bookings b ON (u.user_id = b.student_id OR u.user_id = b.tutor_id)
      LEFT JOIN service_orders so ON (u.user_id = so.buyer_id OR u.user_id = so.freelancer_id)
      LEFT JOIN transactions t ON u.user_id = t.user_id
      LEFT JOIN support_tickets st ON u.email = st.email
      LEFT JOIN reviews r ON u.user_id = r.student_id
      WHERE u.is_admin = 0
    `;
    const params = [];

    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY u.user_id';

    if (sort === 'spent') query += ' ORDER BY total_spent DESC';
    else if (sort === 'active') query += ' ORDER BY total_sessions DESC';
    else query += ' ORDER BY u.created_at DESC';

    const customers = db.prepare(query).all(...params);
    res.json(customers);
  } catch (err) {
    console.error('CRM customers error:', err);
    res.status(500).json({ error: 'Failed to get customers' });
  }
});

// GET /api/admin/crm/customers/:id - Single customer detail with communication history
router.get('/crm/customers/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const userId = req.params.id;
    const user = db.prepare(`
      SELECT user_id, full_name, email, role, institution, programme, year_of_study, bio,
        wallet_balance, earnings_balance, is_active, is_student, created_at, last_login_at
      FROM users WHERE user_id = ?
    `).get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const transactions = db.prepare(`
      SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(userId);

    const bookings = db.prepare(`
      SELECT b.*, sl.title, s.skill_name,
        tu.full_name as tutor_name, su.full_name as student_name
      FROM bookings b
      JOIN session_listings sl ON b.listing_id = sl.listing_id
      JOIN skills s ON sl.skill_id = s.skill_id
      JOIN users tu ON b.tutor_id = tu.user_id
      JOIN users su ON b.student_id = su.user_id
      WHERE b.student_id = ? OR b.tutor_id = ?
      ORDER BY b.requested_at DESC LIMIT 20
    `).all(userId, userId);

    const messages = db.prepare(`
      SELECT sm.*, sender.full_name as sender_name, receiver.full_name as receiver_name
      FROM service_messages sm
      JOIN users sender ON sm.sender_id = sender.user_id
      JOIN users receiver ON sm.receiver_id = receiver.user_id
      WHERE sm.sender_id = ? OR sm.receiver_id = ?
      ORDER BY sm.sent_at DESC LIMIT 30
    `).all(userId, userId);

    const userEmail = user.email;
    const supportTickets = db.prepare(`
      SELECT * FROM support_tickets WHERE email = ? ORDER BY created_at DESC
    `).all(userEmail);

    const reviews = db.prepare(`
      SELECT r.*, tu.full_name as tutor_name
      FROM reviews r JOIN users tu ON r.tutor_id = tu.user_id
      WHERE r.student_id = ? ORDER BY r.created_at DESC
    `).all(userId);

    res.json({ customer: user, transactions, bookings, messages, support_tickets: supportTickets, reviews });
  } catch (err) {
    console.error('CRM customer detail error:', err);
    res.status(500).json({ error: 'Failed to get customer details' });
  }
});

// GET /api/admin/crm/communications - All recent communications across platform
router.get('/crm/communications', authenticateToken, requireAdmin, (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT sm.*, sender.full_name as sender_name, receiver.full_name as receiver_name
      FROM service_messages sm
      JOIN users sender ON sm.sender_id = sender.user_id
      JOIN users receiver ON sm.receiver_id = receiver.user_id
      ORDER BY sm.sent_at DESC LIMIT 50
    `).all();

    const sessionMessages = db.prepare(`
      SELECT m.*, u.full_name as sender_name, b.booking_id
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id
      JOIN bookings b ON m.booking_id = b.booking_id
      ORDER BY m.sent_at DESC LIMIT 50
    `).all();

    const tickets = db.prepare(`
      SELECT st.*, st.name as user_name
      FROM support_tickets st
      ORDER BY st.created_at DESC LIMIT 30
    `).all();

    res.json({ messages, session_messages: sessionMessages, support_tickets: tickets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get communications' });
  }
});

// GET /api/admin/crm/feedback - All reviews and support tickets (feedback management)
router.get('/crm/feedback', authenticateToken, requireAdmin, (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, su.full_name as student_name, tu.full_name as tutor_name
      FROM reviews r
      JOIN users su ON r.student_id = su.user_id
      JOIN users tu ON r.tutor_id = tu.user_id
      ORDER BY r.created_at DESC
    `).all();

    const serviceReviews = db.prepare(`
      SELECT sr.*, reviewer.full_name as reviewer_name, reviewee.full_name as reviewee_name
      FROM service_reviews sr
      JOIN users reviewer ON sr.reviewer_id = reviewer.user_id
      JOIN users reviewee ON sr.reviewee_id = reviewee.user_id
      ORDER BY sr.created_at DESC
    `).all();

    const avgRating = db.prepare('SELECT AVG(star_rating) as avg FROM reviews').get();
    const avgServiceRating = db.prepare('SELECT AVG(star_rating) as avg FROM service_reviews').get();

    res.json({
      reviews,
      service_reviews: serviceReviews,
      stats: {
        total_reviews: reviews.length,
        total_service_reviews: serviceReviews.length,
        avg_session_rating: avgRating.avg ? Number(avgRating.avg).toFixed(1) : 'N/A',
        avg_service_rating: avgServiceRating.avg ? Number(avgServiceRating.avg).toFixed(1) : 'N/A',
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// ========== INVENTORY MANAGEMENT ==========

// GET /api/admin/inventory - Complete inventory of all services/listings
router.get('/inventory', authenticateToken, requireAdmin, (req, res) => {
  try {
    // Tutoring listings (service products)
    const listings = db.prepare(`
      SELECT sl.*, s.skill_name, s.category, u.full_name as tutor_name, u.institution,
        COUNT(DISTINCT a.availability_id) as available_slots,
        COUNT(DISTINCT CASE WHEN b.status IN ('completed','rated') THEN b.booking_id END) as completed_sessions,
        COUNT(DISTINCT CASE WHEN b.status IN ('requested','confirmed','in_progress') THEN b.booking_id END) as active_bookings
      FROM session_listings sl
      JOIN skills s ON sl.skill_id = s.skill_id
      JOIN users u ON sl.tutor_id = u.user_id
      LEFT JOIN availability a ON sl.tutor_id = a.tutor_id
      LEFT JOIN bookings b ON sl.listing_id = b.listing_id
      GROUP BY sl.listing_id
      ORDER BY sl.created_at DESC
    `).all();

    // Service gigs (freelance products)
    const gigs = db.prepare(`
      SELECT g.*, sc.category_name, u.full_name as freelancer_name, u.institution,
        COUNT(DISTINCT CASE WHEN so.status = 'completed' THEN so.order_id END) as completed_orders,
        COUNT(DISTINCT CASE WHEN so.status IN ('pending','in_progress','delivered') THEN so.order_id END) as active_orders
      FROM service_gigs g
      JOIN service_categories sc ON g.category_id = sc.category_id
      JOIN users u ON g.freelancer_id = u.user_id
      LEFT JOIN service_orders so ON g.gig_id = so.gig_id
      GROUP BY g.gig_id
      ORDER BY g.created_at DESC
    `).all();

    // Summary stats
    const totalActiveListings = listings.filter(l => l.status === 'active').length;
    const totalActiveGigs = gigs.filter(g => g.status === 'active').length;
    const totalAvailSlots = listings.reduce((s, l) => s + l.available_slots, 0);

    res.json({
      listings,
      gigs,
      stats: {
        total_listings: listings.length,
        active_listings: totalActiveListings,
        total_gigs: gigs.length,
        active_gigs: totalActiveGigs,
        total_availability_slots: totalAvailSlots,
        total_products: listings.length + gigs.length,
      }
    });
  } catch (err) {
    console.error('Inventory error:', err);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

// ========== SUPPLY CHAIN MANAGEMENT ==========

// GET /api/admin/supply-chain - Suppliers, partners, distribution
router.get('/supply-chain', authenticateToken, requireAdmin, (req, res) => {
  try {
    // Suppliers = Tutors and Freelancers who supply services
    const suppliers = db.prepare(`
      SELECT u.user_id, u.full_name, u.email, u.institution, u.role, u.is_active, u.created_at,
        u.earnings_balance,
        COUNT(DISTINCT sl.listing_id) as total_listings,
        COUNT(DISTINCT g.gig_id) as total_gigs,
        COUNT(DISTINCT CASE WHEN b.status IN ('completed','rated') THEN b.booking_id END) as completed_sessions,
        COUNT(DISTINCT CASE WHEN so.status = 'completed' THEN so.order_id END) as completed_orders,
        COALESCE(AVG(r.star_rating), 0) as avg_rating
      FROM users u
      LEFT JOIN session_listings sl ON u.user_id = sl.tutor_id AND sl.status = 'active'
      LEFT JOIN service_gigs g ON u.user_id = g.freelancer_id AND g.status = 'active'
      LEFT JOIN bookings b ON u.user_id = b.tutor_id
      LEFT JOIN service_orders so ON u.user_id = so.freelancer_id
      LEFT JOIN reviews r ON u.user_id = r.tutor_id
      WHERE u.role IN ('tutor', 'both') AND u.is_admin = 0
      GROUP BY u.user_id
      ORDER BY completed_sessions + completed_orders DESC
    `).all();

    // Partners = Institutions
    const partners = db.prepare(`
      SELECT u.institution,
        COUNT(DISTINCT u.user_id) as total_users,
        COUNT(DISTINCT CASE WHEN u.role IN ('tutor','both') THEN u.user_id END) as suppliers,
        COUNT(DISTINCT CASE WHEN u.role IN ('student','both') THEN u.user_id END) as buyers,
        COUNT(DISTINCT sl.listing_id) as listings_supplied,
        COUNT(DISTINCT g.gig_id) as gigs_supplied,
        COUNT(DISTINCT CASE WHEN b.status IN ('completed','rated') THEN b.booking_id END) as sessions_delivered,
        COUNT(DISTINCT CASE WHEN so.status = 'completed' THEN so.order_id END) as services_delivered,
        COALESCE(SUM(CASE WHEN b.status IN ('completed','rated') THEN b.session_fee ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN so.status = 'completed' THEN so.agreed_price ELSE 0 END), 0) as total_revenue
      FROM users u
      LEFT JOIN session_listings sl ON u.user_id = sl.tutor_id
      LEFT JOIN service_gigs g ON u.user_id = g.freelancer_id
      LEFT JOIN bookings b ON u.user_id = b.tutor_id
      LEFT JOIN service_orders so ON u.user_id = so.freelancer_id
      WHERE u.is_admin = 0
      GROUP BY u.institution
      ORDER BY total_revenue DESC
    `).all();

    // Distribution = How services are distributed (by category, format, status)
    const distributionByCategory = db.prepare(`
      SELECT s.category, COUNT(DISTINCT sl.listing_id) as listings,
        COUNT(DISTINCT CASE WHEN b.status IN ('completed','rated') THEN b.booking_id END) as delivered
      FROM skills s
      LEFT JOIN session_listings sl ON s.skill_id = sl.skill_id AND sl.status = 'active'
      LEFT JOIN bookings b ON sl.listing_id = b.listing_id
      WHERE s.is_active = 1
      GROUP BY s.category
      ORDER BY delivered DESC
    `).all();

    const distributionByFormat = db.prepare(`
      SELECT sl.delivery_format as format,
        COUNT(DISTINCT sl.listing_id) as count,
        COUNT(DISTINCT CASE WHEN b.status IN ('completed','rated') THEN b.booking_id END) as delivered
      FROM session_listings sl
      LEFT JOIN bookings b ON sl.listing_id = b.listing_id
      WHERE sl.status = 'active'
      GROUP BY sl.delivery_format
    `).all();

    // Service categories distribution
    const serviceDistribution = db.prepare(`
      SELECT sc.category_name, COUNT(DISTINCT g.gig_id) as gigs,
        COUNT(DISTINCT CASE WHEN so.status = 'completed' THEN so.order_id END) as delivered
      FROM service_categories sc
      LEFT JOIN service_gigs g ON sc.category_id = g.category_id AND g.status = 'active'
      LEFT JOIN service_orders so ON g.gig_id = so.gig_id
      WHERE sc.is_active = 1
      GROUP BY sc.category_id
      ORDER BY delivered DESC
    `).all();

    res.json({
      suppliers,
      partners,
      distribution: {
        by_category: distributionByCategory,
        by_format: distributionByFormat,
        by_service_category: serviceDistribution,
      },
      stats: {
        total_suppliers: suppliers.length,
        active_suppliers: suppliers.filter(s => s.is_active).length,
        total_partners: partners.length,
        total_products_in_supply: suppliers.reduce((s, sup) => s + sup.total_listings + sup.total_gigs, 0),
      }
    });
  } catch (err) {
    console.error('Supply chain error:', err);
    res.status(500).json({ error: 'Failed to get supply chain data' });
  }
});

// ========== DELIVERY MANAGEMENT ==========

// GET /api/admin/deliveries - All orders/bookings with delivery status tracking
router.get('/deliveries', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status, type } = req.query;

    // Session deliveries
    let sessionQuery = `
      SELECT b.booking_id as id, 'session' as type, sl.title, s.skill_name,
        tu.full_name as provider_name, su.full_name as customer_name,
        b.status, b.delivery_format, b.scheduled_date as delivery_date,
        b.session_fee as price, b.requested_at as created_at, b.completed_at
      FROM bookings b
      JOIN session_listings sl ON b.listing_id = sl.listing_id
      JOIN skills s ON sl.skill_id = s.skill_id
      JOIN users tu ON b.tutor_id = tu.user_id
      JOIN users su ON b.student_id = su.user_id
    `;

    // Service deliveries
    let serviceQuery = `
      SELECT so.order_id as id, 'service' as type,
        COALESCE(g.title, sr.title) as title, '' as skill_name,
        freelancer.full_name as provider_name, buyer.full_name as customer_name,
        so.status, 'remote' as delivery_format, so.created_at as delivery_date,
        so.agreed_price as price, so.created_at, so.completed_at
      FROM service_orders so
      JOIN users buyer ON so.buyer_id = buyer.user_id
      JOIN users freelancer ON so.freelancer_id = freelancer.user_id
      LEFT JOIN service_gigs g ON so.gig_id = g.gig_id
      LEFT JOIN service_requests sr ON so.request_id = sr.request_id
    `;

    if (status) {
      sessionQuery += ` WHERE b.status = '${status}'`;
      serviceQuery += ` WHERE so.status = '${status}'`;
    }

    let deliveries = [];

    if (!type || type === 'session') {
      deliveries = deliveries.concat(db.prepare(sessionQuery + ' ORDER BY b.requested_at DESC').all());
    }
    if (!type || type === 'service') {
      deliveries = deliveries.concat(db.prepare(serviceQuery + ' ORDER BY so.created_at DESC').all());
    }

    // Sort combined results by date
    deliveries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Stats
    const totalDeliveries = deliveries.length;
    const completed = deliveries.filter(d => d.status === 'completed' || d.status === 'rated').length;
    const inProgress = deliveries.filter(d => ['confirmed', 'in_progress', 'delivered'].includes(d.status)).length;
    const pending = deliveries.filter(d => ['requested', 'pending'].includes(d.status)).length;
    const cancelled = deliveries.filter(d => d.status === 'cancelled').length;

    res.json({
      deliveries,
      stats: {
        total: totalDeliveries,
        completed,
        in_progress: inProgress,
        pending,
        cancelled,
        completion_rate: totalDeliveries > 0 ? ((completed / totalDeliveries) * 100).toFixed(1) : '0',
      }
    });
  } catch (err) {
    console.error('Deliveries error:', err);
    res.status(500).json({ error: 'Failed to get deliveries' });
  }
});

module.exports = router;
