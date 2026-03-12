const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Access fee for non-student users (GHS)
const ACCESS_FEE = 50;

// POST /api/auth/register
router.post('/register', [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'tutor', 'both']).withMessage('Role must be student, tutor, or both'),
  body('institution').trim().notEmpty().withMessage('Institution is required'),
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

    // Determine account type based on email domain
    const isStudentEmail = email.toLowerCase().endsWith('.edu.gh');
    const accountType = isStudentEmail ? 'student' : 'external';

    // Non-student emails require access fee payment
    if (!isStudentEmail && !access_fee_reference) {
      return res.status(402).json({
        error: 'Non-student email detected. A one-time access fee of GHS 50 is required to use SkillBridge.',
        requires_payment: true,
        access_fee: ACCESS_FEE,
        account_type: 'external'
      });
    }

    const user_id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const accessFeePaid = isStudentEmail ? 0 : 1;

    db.prepare(`INSERT INTO users (user_id, full_name, email, password_hash, role, institution, programme, year_of_study, bio, wallet_balance, earnings_balance, is_verified, is_active, is_admin, account_type, access_fee_paid, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, 1, 0, ?, ?, ?)`).run(
      user_id, full_name, email, password_hash, role, institution, programme || null, year_of_study || null, bio || null, accountType, accessFeePaid, now
    );

    // Record access fee transaction for non-students
    if (!isStudentEmail) {
      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, NULL, 'top_up', ?, 'credit', 'completed', ?, ?)`).run(
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

    const token = jwt.sign({ user_id, email, role, is_admin: 0, full_name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { user_id, full_name, email, role, institution, is_admin: 0, account_type: accountType }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', [
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
      full_name: user.full_name
    }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
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
    const user = db.prepare('SELECT user_id, full_name, email, role, institution, programme, year_of_study, bio, profile_photo_url, wallet_balance, earnings_balance, is_verified, is_active, is_admin, account_type, created_at FROM users WHERE user_id = ?').get(req.user.user_id);

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
