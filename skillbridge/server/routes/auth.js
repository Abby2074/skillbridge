const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 requests per window
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Access fee for non-student users (GHS)
const ACCESS_FEE = 120;

// POST /api/auth/register
router.post('/register', authLimiter, [
  body('full_name').trim().notEmpty().isLength({ max: 100 }).withMessage('Full name is required (max 100 chars)'),
  body('email').isEmail().isLength({ max: 255 }).withMessage('Valid email is required'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters'),
  body('role').isIn(['student', 'tutor', 'both', 'buyer']).withMessage('Role must be student, tutor, both, or buyer'),
  body('institution').if(body('role').not().equals('buyer')).trim().notEmpty().isLength({ max: 200 }).withMessage('Institution is required (max 200 chars)'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { full_name, email, password, role, institution, programme, year_of_study, bio, hourly_rate, skill_ids, access_fee_reference } = req.body;

    // Check if email already exists
    const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Determine if user is a student based on email domain
    const studentDomains = ['.edu', '.edu.gh', '.ac.gh', '.ug.edu.gh', '.knust.edu.gh', '.ashesi.edu.gh', '.ucc.edu.gh', '.gimpa.edu.gh', '.uew.edu.gh', '.upsa.edu.gh', '.gctu.edu.gh', '.umat.edu.gh', '.uds.edu.gh'];
    const emailLower = email.toLowerCase();
    const is_student = studentDomains.some(domain => emailLower.endsWith(domain)) ? 1 : 0;
    const isStudentEmail = is_student === 1;
    const accountType = isStudentEmail ? 'student' : 'external';

    // Non-students can only register as buyers
    if (!is_student && (role === 'tutor' || role === 'both')) {
      return res.status(400).json({ error: 'Only students with a valid university email can register as tutors or freelancers. You can register as a buyer.' });
    }

    // Non-student emails require access fee payment
    if (!isStudentEmail && role !== 'buyer' && !access_fee_reference) {
      return res.status(402).json({
        error: 'Non-student email detected. A one-time access fee of GHS 120 is required to use SkillBridge.',
        requires_payment: true,
        access_fee: ACCESS_FEE,
        account_type: 'external'
      });
    }

    const user_id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const accessFeePaid = (isStudentEmail || role === 'buyer') ? 0 : 1;

    db.prepare(`INSERT INTO users (user_id, full_name, email, password_hash, role, is_student, institution, programme, year_of_study, bio, wallet_balance, earnings_balance, is_verified, is_active, is_admin, account_type, access_fee_paid, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, 1, 0, ?, ?, ?)`).run(
      user_id, full_name, email, password_hash, role, is_student, institution, programme || null, year_of_study || null, bio || null, accountType, accessFeePaid, now
    );

    // Record access fee transaction for non-students (skip for buyers)
    if (!isStudentEmail && role !== 'buyer') {
      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, NULL, 'access_fee', ?, 'debit', 'completed', ?, ?)`).run(
        uuidv4(), user_id, ACCESS_FEE, access_fee_reference, now
      );
    }

    // If tutor, create listings for selected skills
    if ((role === 'tutor' || role === 'both') && skill_ids && skill_ids.length > 0) {
      const insertListing = db.prepare(`INSERT INTO session_listings (listing_id, tutor_id, skill_id, title, description, hourly_rate, delivery_format, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`);
      for (const skill_id of skill_ids) {
        const skill = db.prepare('SELECT skill_name FROM skills WHERE skill_id = ?').get(skill_id);
        if (skill) {
          insertListing.run(uuidv4(), user_id, skill_id, `${skill.skill_name.split('(')[0].trim()} Tutoring`, `One-on-one tutoring in ${skill.skill_name}`, hourly_rate || 50, 'both', now, now);
        }
      }
    }

    const token = jwt.sign({ user_id, email, role, is_admin: 0, is_student, full_name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { user_id, full_name, email, role, is_student, institution, is_admin: 0, account_type: accountType }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account has been suspended. Contact support.' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    db.prepare('UPDATE users SET last_login_at = ? WHERE user_id = ?').run(new Date().toISOString(), user.user_id);

    const token = jwt.sign({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      is_admin: user.is_admin,
      is_student: user.is_student,
      full_name: user.full_name
    }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_student: user.is_student,
        institution: user.institution,
        is_admin: user.is_admin,
        wallet_balance: user.wallet_balance,
        earnings_balance: user.earnings_balance,
        account_type: user.account_type,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT user_id, full_name, email, role, is_student, institution, programme, year_of_study, bio, profile_photo_url, wallet_balance, earnings_balance, is_verified, is_active, is_admin, account_type, created_at FROM users WHERE user_id = ?').get(req.user.user_id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;
