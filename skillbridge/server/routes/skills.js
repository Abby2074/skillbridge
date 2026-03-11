const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/skills
router.get('/', (req, res) => {
  try {
    const skills = db.prepare('SELECT * FROM skills WHERE is_active = 1 ORDER BY skill_name').all();
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

// POST /api/skills/request
router.post('/request', authenticateToken, [
  body('skill_name').trim().notEmpty().withMessage('Skill name is required'),
  body('description').optional().trim(),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { skill_name, description } = req.body;
    const request_id = uuidv4();

    db.prepare(`INSERT INTO skill_requests (request_id, student_id, skill_name, description, status, submitted_at)
      VALUES (?, ?, ?, ?, 'pending', ?)`).run(
      request_id, req.user.user_id, skill_name, description || null, new Date().toISOString()
    );

    res.status(201).json({ request_id, message: 'Skill request submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit skill request' });
  }
});

// GET /api/skills/requests (admin)
router.get('/requests', authenticateToken, requireAdmin, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT sr.*, u.full_name as student_name, u.email as student_email
      FROM skill_requests sr
      JOIN users u ON sr.student_id = u.user_id
      ORDER BY sr.submitted_at DESC
    `).all();

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get skill requests' });
  }
});

// PUT /api/skills/requests/:id (admin)
router.put('/requests/:id', authenticateToken, requireAdmin, [
  body('status').isIn(['approved', 'declined', 'awaiting_tutors']).withMessage('Invalid status'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    const request = db.prepare('SELECT * FROM skill_requests WHERE request_id = ?').get(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Skill request not found' });
    }

    db.prepare('UPDATE skill_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE request_id = ?').run(
      status, req.user.user_id, new Date().toISOString(), req.params.id
    );

    // If approved, create the skill
    if (status === 'approved') {
      const skillId = uuidv4();
      db.prepare('INSERT INTO skills (skill_id, skill_name, category, is_active, created_at) VALUES (?, ?, ?, 1, ?)').run(
        skillId, request.skill_name, 'Custom', new Date().toISOString()
      );
    }

    res.json({ message: `Skill request ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update skill request' });
  }
});

module.exports = router;
