const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ----------------------------------------------------------
// GET /api/admin/claims  – all claims (filterable by status)
// ----------------------------------------------------------
router.get('/claims', async (req, res) => {
  const status = req.query.status; // optional: pending | approved | rejected

  let sql = `
    SELECT c.id, c.report_id, c.claimant_id, c.evidence, c.status,
           c.admin_response, c.created_at, c.reviewed_at,
           r.title AS report_title, r.private_details, r.location, r.status AS report_status,
           u.full_name AS claimant_name, u.email AS claimant_email
    FROM claims c
    JOIN reports r ON r.id = c.report_id
    JOIN users u ON u.id = c.claimant_id
  `;
  const params = {};

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    sql += ` WHERE c.status = :status`;
    params.status = status;
  }

  sql += ` ORDER BY c.created_at DESC`;

  try {
    const [rows] = await pool.execute(sql, params);
    res.json({ claims: rows });
  } catch (err) {
    console.error('Admin list claims error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------------------------------------
// PATCH /api/admin/claims/:id  – approve or reject a claim
// ----------------------------------------------------------
router.patch(
  '/claims/:id',
  [
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
    body('admin_response').optional({ nullable: true }).trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const claimId = Number(req.params.id);
    const { status, admin_response } = req.body;

    if (!claimId) return res.status(400).json({ error: 'Invalid claim id' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock the claim row
      const [claims] = await conn.execute(
        `SELECT c.id, c.report_id, c.status AS claim_status, r.status AS report_status
         FROM claims c
         JOIN reports r ON r.id = c.report_id
         WHERE c.id = :id
         FOR UPDATE`,
        { id: claimId }
      );

      if (claims.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'Claim not found' });
      }

      const claim = claims[0];

      if (claim.claim_status !== 'pending') {
        await conn.rollback();
        return res.status(400).json({ error: 'Only pending claims can be reviewed' });
      }
      if (claim.report_status === 'returned') {
        await conn.rollback();
        return res.status(403).json({ error: 'Item has already been returned' });
      }

      // If approving, ensure no other approved claim exists for this report
      if (status === 'approved') {
        const [existing] = await conn.execute(
          `SELECT id FROM claims
           WHERE report_id = :rid AND status = 'approved' AND id != :cid`,
          { rid: claim.report_id, cid: claimId }
        );
        if (existing.length > 0) {
          await conn.rollback();
          return res.status(403).json({
            error: 'Another claim has already been approved for this item',
          });
        }

        // Mark report as claimed
        await conn.execute(
          `UPDATE reports SET status = 'claimed' WHERE id = :rid`,
          { rid: claim.report_id }
        );
      }

      await conn.execute(
        `UPDATE claims SET
           status = :status,
           admin_response = :admin_response,
           reviewed_by = :admin_id,
           reviewed_at = NOW()
         WHERE id = :id`,
        {
          status,
          admin_response: admin_response || null,
          admin_id: req.user.id,
          id: claimId,
        }
      );

      await conn.commit();

      const [updated] = await pool.execute(
        `SELECT c.*, r.title AS report_title
         FROM claims c JOIN reports r ON r.id = c.report_id
         WHERE c.id = :id`,
        { id: claimId }
      );

      res.json({ message: `Claim ${status}`, claim: updated[0] });
    } catch (err) {
      await conn.rollback();
      console.error('Review claim error:', err);
      res.status(500).json({ error: 'Server error reviewing claim' });
    } finally {
      conn.release();
    }
  }
);

// ----------------------------------------------------------
// PATCH /api/admin/reports/:id/return  – confirm item returned
// ----------------------------------------------------------
router.patch('/reports/:id/return', async (req, res) => {
  const reportId = Number(req.params.id);
  if (!reportId) return res.status(400).json({ error: 'Invalid report id' });

  try {
    const [reports] = await pool.execute(
      'SELECT id, status FROM reports WHERE id = :id',
      { id: reportId }
    );

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    if (reports[0].status === 'returned') {
      return res.status(400).json({ error: 'Item is already marked as returned' });
    }

    await pool.execute(
      `UPDATE reports SET status = 'returned' WHERE id = :id`,
      { id: reportId }
    );

    // Reject any remaining pending claims
    await pool.execute(
      `UPDATE claims SET status = 'rejected',
         admin_response = 'Item has been returned to another claimant',
         reviewed_by = :admin_id,
         reviewed_at = NOW()
       WHERE report_id = :rid AND status = 'pending'`,
      { rid: reportId, admin_id: req.user.id }
    );

    const [rows] = await pool.execute(
      `SELECT r.id, r.title, r.status, r.updated_at FROM reports r WHERE r.id = :id`,
      { id: reportId }
    );

    res.json({ message: 'Item marked as returned', report: rows[0] });
  } catch (err) {
    console.error('Mark returned error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------------------------------------
// GET /api/admin/reports  – all reports with private details
// ----------------------------------------------------------
router.get('/reports', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, u.full_name AS reporter_name
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       ORDER BY r.created_at DESC`
    );
    res.json({ reports: rows });
  } catch (err) {
    console.error('Admin reports error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
