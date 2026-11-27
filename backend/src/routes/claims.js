const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ----------------------------------------------------------
// POST /api/claims  – submit ownership claim on a found item
// ----------------------------------------------------------
router.post(
  '/',
  authenticate,
  [
    body('report_id').isInt({ min: 1 }).withMessage('Valid report_id is required'),
    body('evidence').trim().notEmpty().withMessage('Claim evidence is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const report_id = Number(req.body.report_id);
    const evidence = req.body.evidence.trim();
    const claimant_id = req.user.id;

    try {
      // Load the report
      const [reports] = await pool.execute(
        'SELECT id, type, reporter_id, status FROM reports WHERE id = :id',
        { id: report_id }
      );

      if (reports.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const report = reports[0];

      if (report.type !== 'found') {
        return res.status(400).json({ error: 'You can only claim found items' });
      }
      if (report.status === 'returned') {
        return res.status(403).json({ error: 'This item has already been returned' });
      }
      if (report.reporter_id === claimant_id) {
        return res.status(403).json({ error: 'You cannot claim an item you reported as found' });
      }

      // Check for existing approved claim on this report
      const [approved] = await pool.execute(
        `SELECT id FROM claims WHERE report_id = :rid AND status = 'approved'`,
        { rid: report_id }
      );
      if (approved.length > 0) {
        return res.status(403).json({ error: 'An approved claim already exists for this item' });
      }

      // Insert (unique constraint prevents duplicate claim by same user)
      try {
        const [result] = await pool.execute(
          `INSERT INTO claims (report_id, claimant_id, evidence, status)
           VALUES (:report_id, :claimant_id, :evidence, 'pending')`,
          { report_id, claimant_id, evidence }
        );

        const [rows] = await pool.execute(
          `SELECT c.id, c.report_id, c.claimant_id, c.evidence, c.status,
                  c.admin_response, c.created_at,
                  r.title AS report_title
           FROM claims c
           JOIN reports r ON r.id = c.report_id
           WHERE c.id = :id`,
          { id: result.insertId }
        );

        res.status(201).json({ message: 'Claim submitted', claim: rows[0] });
      } catch (dupErr) {
        if (dupErr.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'You have already claimed this item' });
        }
        throw dupErr;
      }
    } catch (err) {
      console.error('Create claim error:', err);
      res.status(500).json({ error: 'Server error submitting claim' });
    }
  }
);

// ----------------------------------------------------------
// GET /api/claims/mine  – claims made by the current student
// ----------------------------------------------------------
router.get('/mine', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.id, c.report_id, c.evidence, c.status, c.admin_response,
              c.created_at, c.reviewed_at,
              r.title AS report_title, r.location, r.status AS report_status
       FROM claims c
       JOIN reports r ON r.id = c.report_id
       WHERE c.claimant_id = :uid
       ORDER BY c.created_at DESC`,
      { uid: req.user.id }
    );
    res.json({ claims: rows });
  } catch (err) {
    console.error('My claims error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------------------------------------
// GET /api/claims/:id  – single claim (only claimant or admin)
// ----------------------------------------------------------
router.get('/:id', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid claim id' });

  try {
    const [rows] = await pool.execute(
      `SELECT c.*, r.title AS report_title, r.private_details, r.location
       FROM claims c
       JOIN reports r ON r.id = c.report_id
       WHERE c.id = :id`,
      { id }
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const claim = rows[0];
    const isClaimant = claim.claimant_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isClaimant && !isAdmin) {
      return res.status(403).json({ error: 'You are not allowed to view this claim' });
    }

    // Strip private report details if not admin
    if (!isAdmin) {
      delete claim.private_details;
    }

    res.json({ claim });
  } catch (err) {
    console.error('Get claim error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
