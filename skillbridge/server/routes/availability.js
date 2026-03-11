const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/availability/tutor/:tutorId
router.get('/tutor/:tutorId', (req, res) => {
  try {
    const slots = db.prepare('SELECT * FROM availability WHERE tutor_id = ? ORDER BY CASE day_of_week WHEN \'Monday\' THEN 1 WHEN \'Tuesday\' THEN 2 WHEN \'Wednesday\' THEN 3 WHEN \'Thursday\' THEN 4 WHEN \'Friday\' THEN 5 WHEN \'Saturday\' THEN 6 WHEN \'Sunday\' THEN 7 END, start_time').all(req.params.tutorId);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get availability' });
  }
});

// POST /api/availability
router.post('/', authenticateToken, [
  body('day_of_week').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).withMessage('Invalid day'),
  body('start_time').matches(/^\d{2}:\d{2}$/).withMessage('Invalid start time format (HH:MM)'),
  body('end_time').matches(/^\d{2}:\d{2}$/).withMessage('Invalid end time format (HH:MM)'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { day_of_week, start_time, end_time } = req.body;
    const availability_id = uuidv4();

    db.prepare('INSERT INTO availability (availability_id, tutor_id, day_of_week, start_time, end_time, is_booked) VALUES (?, ?, ?, ?, ?, 0)').run(
      availability_id, req.user.user_id, day_of_week, start_time, end_time
    );

    const slot = db.prepare('SELECT * FROM availability WHERE availability_id = ?').get(availability_id);
    res.status(201).json(slot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add availability' });
  }
});

// DELETE /api/availability/:availabilityId
router.delete('/:availabilityId', authenticateToken, (req, res) => {
  try {
    const slot = db.prepare('SELECT * FROM availability WHERE availability_id = ?').get(req.params.availabilityId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.tutor_id !== req.user.user_id) return res.status(403).json({ error: 'Not your slot' });
    if (slot.is_booked) return res.status(400).json({ error: 'Cannot delete a booked slot' });

    db.prepare('DELETE FROM availability WHERE availability_id = ?').run(req.params.availabilityId);
    res.json({ message: 'Slot removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove slot' });
  }
});

module.exports = router;
