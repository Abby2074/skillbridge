const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/invoices/:bookingId
router.get('/:bookingId', authenticateToken, (req, res) => {
  try {
    const booking = db.prepare(`
      SELECT b.*, sl.title, s.skill_name,
        tu.full_name as tutor_name, tu.email as tutor_email, tu.institution as tutor_institution,
        su.full_name as student_name, su.email as student_email, su.institution as student_institution
      FROM bookings b
      JOIN session_listings sl ON b.listing_id = sl.listing_id
      JOIN skills s ON sl.skill_id = s.skill_id
      JOIN users tu ON b.tutor_id = tu.user_id
      JOIN users su ON b.student_id = su.user_id
      WHERE b.booking_id = ? AND (b.student_id = ? OR b.tutor_id = ? OR ? = 1)
    `).get(req.params.bookingId, req.user.user_id, req.user.user_id, req.user.is_admin ? 1 : 0);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!['completed', 'rated'].includes(booking.status)) {
      return res.status(400).json({ error: 'Invoice only available for completed sessions' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${booking.booking_id.slice(0, 8)}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('SkillBridge', 50, 50);
    doc.fontSize(10).font('Helvetica').text('Student Peer-to-Peer Tutoring Marketplace', 50, 80);
    doc.moveDown(0.5);

    // Invoice details
    doc.fontSize(18).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice #: INV-${booking.booking_id.slice(0, 8).toUpperCase()}`, 400, 75, { align: 'right' });
    doc.text(`Date: ${new Date(booking.completed_at || booking.requested_at).toLocaleDateString('en-GB')}`, 400, 90, { align: 'right' });

    // Divider
    doc.moveTo(50, 120).lineTo(545, 120).stroke('#1B4F72');

    // Student info
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, 140);
    doc.fontSize(10).font('Helvetica');
    doc.text(booking.student_name, 50, 158);
    doc.text(booking.student_email, 50, 172);
    doc.text(booking.student_institution, 50, 186);

    // Tutor info
    doc.fontSize(12).font('Helvetica-Bold').text('Tutor:', 350, 140);
    doc.fontSize(10).font('Helvetica');
    doc.text(booking.tutor_name, 350, 158);
    doc.text(booking.tutor_email, 350, 172);
    doc.text(booking.tutor_institution, 350, 186);

    // Session details table
    const tableTop = 230;
    doc.fontSize(12).font('Helvetica-Bold').text('Session Details', 50, tableTop);

    // Table header
    const headerY = tableTop + 25;
    doc.rect(50, headerY, 495, 25).fill('#1B4F72');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('white');
    doc.text('Description', 60, headerY + 7, { width: 200 });
    doc.text('Skill', 270, headerY + 7, { width: 120 });
    doc.text('Duration', 390, headerY + 7, { width: 60 });
    doc.text('Amount', 460, headerY + 7, { width: 75, align: 'right' });

    // Table row
    const rowY = headerY + 25;
    doc.rect(50, rowY, 495, 30).fill('#F8F9FA');
    doc.fillColor('#1A1A2E').font('Helvetica');
    doc.text(booking.title, 60, rowY + 9, { width: 200 });
    doc.text(booking.skill_name.split('(')[0].trim(), 270, rowY + 9, { width: 120 });
    doc.text('1 hour', 390, rowY + 9, { width: 60 });
    doc.text(`GHS ${booking.session_fee.toFixed(2)}`, 460, rowY + 9, { width: 75, align: 'right' });

    // Totals
    const totalsY = rowY + 50;
    doc.moveTo(350, totalsY).lineTo(545, totalsY).stroke('#DEE2E6');

    doc.font('Helvetica').fontSize(10);
    doc.text('Subtotal:', 350, totalsY + 10);
    doc.text(`GHS ${booking.session_fee.toFixed(2)}`, 460, totalsY + 10, { width: 75, align: 'right' });

    doc.text('Platform Fee (10%):', 350, totalsY + 30);
    doc.text(`GHS ${booking.platform_commission.toFixed(2)}`, 460, totalsY + 30, { width: 75, align: 'right' });

    doc.text('Tutor Earnings (90%):', 350, totalsY + 50);
    doc.text(`GHS ${booking.tutor_earnings.toFixed(2)}`, 460, totalsY + 50, { width: 75, align: 'right' });

    doc.moveTo(350, totalsY + 70).lineTo(545, totalsY + 70).stroke('#1B4F72');

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Total Paid:', 350, totalsY + 80);
    doc.text(`GHS ${booking.session_fee.toFixed(2)}`, 440, totalsY + 80, { width: 95, align: 'right' });

    // Session info
    const infoY = totalsY + 120;
    doc.fontSize(11).font('Helvetica-Bold').text('Additional Information', 50, infoY);
    doc.fontSize(9).font('Helvetica').fillColor('#6C757D');
    doc.text(`Booking ID: ${booking.booking_id}`, 50, infoY + 20);
    doc.text(`Scheduled Date: ${new Date(booking.scheduled_date).toLocaleDateString('en-GB')}`, 50, infoY + 35);
    doc.text(`Delivery Format: ${booking.delivery_format === 'online' ? 'Online' : 'In-Person'}`, 50, infoY + 50);
    doc.text(`Status: ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}`, 50, infoY + 65);
    if (booking.learning_objectives) {
      doc.text(`Learning Objectives: ${booking.learning_objectives}`, 50, infoY + 80, { width: 495 });
    }

    // Footer
    doc.fontSize(8).fillColor('#6C757D');
    doc.text('SkillBridge — Student Peer-to-Peer Tutoring Marketplace', 50, 750, { align: 'center', width: 495 });
    doc.text('This is an automatically generated invoice. For support, contact support@skillbridge.gh', 50, 762, { align: 'center', width: 495 });

    doc.end();
  } catch (err) {
    console.error('Invoice generation error:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

module.exports = router;
