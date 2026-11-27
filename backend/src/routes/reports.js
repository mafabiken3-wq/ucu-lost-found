const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Columns that are safe to return to any authenticated user
const PUBLIC_COLUMNS = `
  r.id, r.type, r.title, r.category, r.public_desc, r.location,
  r.incident_date, r.photo_path, r.status, r.created_at, r.updated_at,
  r.reporter_id, u.full_name AS reporter_name
`;

// ----------------------------------------------------------
// GET /api/reports  – search & filter (public fields only)
// ----------------------------------------------------------
router.get(
  '/',
  authenticate,
  [
    query('keyword').optional().trim(),
    query('type').optional().isIn(['lost', 'found']),
    query('category').optional().trim(),
    query('location').optional().trim(),
    query('status').optional().isIn(['open', 'claimed', 'returned']),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { keyword, type, category, location, status, date_from, date_to } = req.query;

    let sql = `
      SELECT ${PUBLIC_COLUMNS}
      FROM reports r
      JOIN users u ON u.id = r.reporter_id
      WHERE 1=1
    `;
    const params = {};

    if (keyword) {
      sql += ` AND (r.title LIKE :kw OR r.public_desc LIKE :kw OR r.location LIKE :kw)`;
      params.kw = `%${keyword}%`;
    }
    if (type) {
      sql += ` AND r.type = :type`;
      params.type = type;
    }
    if (category) {
      sql += ` AND r.category = :category`;
      params.category = category;
    }
    if (location) {
      sql += ` AND r.location LIKE :location`;
      params.location = `%${location}%`;
    }
    if (status) {
      sql += ` AND r.status = :status`;
      params.status = status;
    }
    if (date_from) {
      sql += ` AND r.incident_date >= :date_from`;
      params.date_from = date_from;
    }
    if (date_to) {
      sql += ` AND r.incident_date <= :date_to`;
      params.date_to = date_to;
    }

    sql += ` ORDER BY r.created_at DESC LIMIT 100`;

    try {
      const [rows] = await pool.execute(sql, params);
      res.json({ reports: rows });
    } catch (err) {
      console.error('List reports error:', err);
      res.status(500).json({ error: 'Server error fetching reports' });
    }
  }
);

// ----------------------------------------------------------
// GET /api/reports/mine  – reports created by the current user
// ----------------------------------------------------------
router.get('/mine', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ${PUBLIC_COLUMNS}, r.private_details
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       WHERE r.reporter_id = :uid
       ORDER BY r.created_at DESC`,
      { uid: req.user.id }
    );
    res.json({ reports: rows });
  } catch (err) {
    console.error('My reports error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------------------------------------
// GET /api/reports/:id  – single report
// Private details returned only to owner or admin
// ----------------------------------------------------------
router.get('/:id', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid report id' });

  try {
    const [rows] = await pool.execute(
      `SELECT ${PUBLIC_COLUMNS}, r.private_details
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       WHERE r.id = :id`,
      { id }
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = rows[0];
    const isOwner = report.reporter_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Strip private_details for everyone else
    if (!isOwner && !isAdmin) {
      delete report.private_details;
    }

    res.json({ report });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ----------------------------------------------------------
// POST /api/reports  – create lost or found report
// ----------------------------------------------------------
const createRules = [
  body('type').isIn(['lost', 'found']).withMessage('Type must be lost or found'),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 150 }),
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 60 }),
  body('public_desc').trim().notEmpty().withMessage('Public description is required'),
  body('location').trim().notEmpty().withMessage('Location is required').isLength({ max: 100 }),
  body('incident_date').isISO8601().withMessage('Valid incident date is required'),
  body('private_details').optional({ nullable: true }).trim(),
];

router.post('/', authenticate, createRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    type, title, category, public_desc, location, incident_date, private_details,
  } = req.body;

  // private_details only meaningful for found items
  const priv = type === 'found' ? (private_details || null) : null;

  try {
    const [result] = await pool.execute(
      `INSERT INTO reports
         (reporter_id, type, title, category, public_desc, private_details,
          location, incident_date, status)
       VALUES
         (:reporter_id, :type, :title, :category, :public_desc, :private_details,
          :location, :incident_date, 'open')`,
      {
        reporter_id: req.user.id,
        type,
        title,
        category,
        public_desc,
        private_details: priv,
        location,
        incident_date,
      }
    );

    const [rows] = await pool.execute(
      `SELECT ${PUBLIC_COLUMNS}, r.private_details
       FROM reports r JOIN users u ON u.id = r.reporter_id
       WHERE r.id = :id`,
      { id: result.insertId }
    );

    res.status(201).json({ message: 'Report created', report: rows[0] });
  } catch (err) {
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Server error creating report' });
  }
});

// ----------------------------------------------------------
// PUT /api/reports/:id  – edit own open report
// ----------------------------------------------------------
router.put('/:id', authenticate, createRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid report id' });

  try {
    const [existing] = await pool.execute(
      'SELECT id, reporter_id, status FROM reports WHERE id = :id',
      { id }
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    if (existing[0].reporter_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own reports' });
    }
    if (existing[0].status !== 'open') {
      return res.status(400).json({ error: 'Only open reports can be edited' });
    }

    const {
      type, title, category, public_desc, location, incident_date, private_details,
    } = req.body;
    const priv = type === 'found' ? (private_details || null) : null;

    await pool.execute(
      `UPDATE reports SET
         type = :type, title = :title, category = :category,
         public_desc = :public_desc, private_details = :private_details,
         location = :location, incident_date = :incident_date
       WHERE id = :id`,
      { type, title, category, public_desc, private_details: priv, location, incident_date, id }
    );

    const [rows] = await pool.execute(
      `SELECT ${PUBLIC_COLUMNS}, r.private_details
       FROM reports r JOIN users u ON u.id = r.reporter_id
       WHERE r.id = :id`,
      { id }
    );

    res.json({ message: 'Report updated', report: rows[0] });
  } catch (err) {
    console.error('Update report error:', err);
    res.status(500).json({ error: 'Server error updating report' });
  }
});

module.exports = router;
