const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/listings
router.get('/', (req, res) => {
  try {
    const listings = db.prepare(`
      SELECT sl.*, s.skill_name, s.category,
        u.full_name as tutor_name, u.institution, u.profile_photo_url,
        COALESCE(AVG(r.star_rating), 0) as avg_rating,
        COUNT(DISTINCT r.review_id) as review_count,
        COUNT(DISTINCT CASE WHEN b.status IN ('completed','rated') THEN b.booking_id END) as session_count
      FROM session_listings sl
      JOIN skills s ON sl.skill_id = s.skill_id
      JOIN users u ON sl.tutor_id = u.user_id
      LEFT JOIN reviews r ON sl.tutor_id = r.tutor_id
      LEFT JOIN bookings b ON sl.tutor_id = b.tutor_id
      WHERE sl.status = 'active' AND u.is_active = 1
      GROUP BY sl.listing_id
      ORDER BY avg_rating DESC
    `).all();

    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get listings' });
  }
});

// GET /api/listings/:listingId
router.get('/:listingId', (req, res) => {
  try {
    const listing = db.prepare(`
      SELECT sl.*, s.skill_name, s.category,
        u.full_name as tutor_name, u.institution, u.bio as tutor_bio, u.profile_photo_url, u.user_id as tutor_id,
        COALESCE(AVG(r.star_rating), 0) as avg_rating,
        COUNT(DISTINCT r.review_id) as review_count,
        COUNT(DISTINCT CASE WHEN b.status IN ('completed','rated') THEN b.booking_id END) as session_count
      FROM session_listings sl
      JOIN skills s ON sl.skill_id = s.skill_id
      JOIN users u ON sl.tutor_id = u.user_id
      LEFT JOIN reviews r ON sl.tutor_id = r.tutor_id
      LEFT JOIN bookings b ON sl.tutor_id = b.tutor_id
      WHERE sl.listing_id = ?
      GROUP BY sl.listing_id
    `).get(req.params.listingId);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get listing' });
  }
});

// POST /api/listings
router.post('/', authenticateToken, [
  body('skill_id').notEmpty().withMessage('Skill is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('hourly_rate').isFloat({ min: 1 }).withMessage('Hourly rate must be positive'),
  body('delivery_format').isIn(['online', 'in_person', 'both']).withMessage('Invalid delivery format'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = db.prepare('SELECT role FROM users WHERE user_id = ?').get(req.user.user_id);
    if (!user || (user.role !== 'tutor' && user.role !== 'both')) {
      return res.status(403).json({ error: 'Only tutors can create listings' });
    }

    const { skill_id, title, description, hourly_rate, delivery_format } = req.body;
    const listing_id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`INSERT INTO session_listings (listing_id, tutor_id, skill_id, title, description, hourly_rate, delivery_format, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`).run(
      listing_id, req.user.user_id, skill_id, title, description, hourly_rate, delivery_format, now, now
    );

    const listing = db.prepare('SELECT * FROM session_listings WHERE listing_id = ?').get(listing_id);
    res.status(201).json(listing);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PUT /api/listings/:listingId
router.put('/:listingId', authenticateToken, (req, res) => {
  try {
    const listing = db.prepare('SELECT * FROM session_listings WHERE listing_id = ?').get(req.params.listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.tutor_id !== req.user.user_id) return res.status(403).json({ error: 'Not your listing' });

    const { title, description, hourly_rate, delivery_format, status } = req.body;

    db.prepare(`UPDATE session_listings SET title = ?, description = ?, hourly_rate = ?, delivery_format = ?, status = ?, updated_at = ? WHERE listing_id = ?`).run(
      title || listing.title,
      description || listing.description,
      hourly_rate || listing.hourly_rate,
      delivery_format || listing.delivery_format,
      status || listing.status,
      new Date().toISOString(),
      req.params.listingId
    );

    const updated = db.prepare('SELECT * FROM session_listings WHERE listing_id = ?').get(req.params.listingId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// DELETE /api/listings/:listingId
router.delete('/:listingId', authenticateToken, (req, res) => {
  try {
    const listing = db.prepare('SELECT * FROM session_listings WHERE listing_id = ?').get(req.params.listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.tutor_id !== req.user.user_id) return res.status(403).json({ error: 'Not your listing' });

    db.prepare("UPDATE session_listings SET status = 'archived', updated_at = ? WHERE listing_id = ?").run(new Date().toISOString(), req.params.listingId);

    res.json({ message: 'Listing archived' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive listing' });
  }
});

module.exports = router;
