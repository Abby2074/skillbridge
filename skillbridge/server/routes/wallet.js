const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/wallet/topup
router.post('/topup', authenticateToken, [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least GHS 1'),
  body('method').isIn(['mtn_momo', 'vodafone_cash', 'card']).withMessage('Invalid payment method'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, method } = req.body;
    const now = new Date().toISOString();
    const transaction_id = uuidv4();

    const topUp = db.transaction(() => {
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE user_id = ?').run(amount, req.user.user_id);

      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, NULL, 'top_up', ?, 'credit', 'completed', ?, ?)`).run(
        transaction_id, req.user.user_id, amount, `TOPUP-${method.toUpperCase()}-${transaction_id.slice(0, 8)}`, now
      );
    });

    topUp();

    const user = db.prepare('SELECT wallet_balance FROM users WHERE user_id = ?').get(req.user.user_id);

    res.json({
      message: 'Wallet topped up successfully',
      transaction_id,
      new_balance: user.wallet_balance,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to top up wallet' });
  }
});

// POST /api/wallet/withdraw
router.post('/withdraw', authenticateToken, [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least GHS 1'),
  body('method').isIn(['mtn_momo', 'vodafone_cash', 'bank_transfer']).withMessage('Invalid withdrawal method'),
  body('account_number').trim().notEmpty().withMessage('Account/phone number is required'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { amount, method, account_number } = req.body;

    const user = db.prepare('SELECT earnings_balance FROM users WHERE user_id = ?').get(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.earnings_balance < amount) {
      return res.status(400).json({ error: 'Insufficient earnings balance' });
    }

    const now = new Date().toISOString();
    const transaction_id = uuidv4();

    const withdraw = db.transaction(() => {
      db.prepare('UPDATE users SET earnings_balance = earnings_balance - ? WHERE user_id = ?').run(amount, req.user.user_id);

      db.prepare(`INSERT INTO transactions (transaction_id, user_id, booking_id, transaction_type, amount, direction, status, payment_reference, created_at)
        VALUES (?, ?, NULL, 'withdrawal', ?, 'debit', 'completed', ?, ?)`).run(
        transaction_id, req.user.user_id, amount, `WDR-${method.toUpperCase()}-${account_number}`, now
      );
    });

    withdraw();

    const updated = db.prepare('SELECT earnings_balance FROM users WHERE user_id = ?').get(req.user.user_id);

    res.json({
      message: 'Withdrawal processed successfully',
      transaction_id,
      new_earnings_balance: updated.earnings_balance,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// GET /api/wallet/transactions
router.get('/transactions', authenticateToken, (req, res) => {
  try {
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC').all(req.user.user_id);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

module.exports = router;
