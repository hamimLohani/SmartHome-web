// ═══════════════════════════════════════════════════════════
// REQUESTS ROUTES — Client requests to admin
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { sendRequestStatusEmail } = require('../mail/mailer');

router.use(authMiddleware);

// ───────────────────────────────────────────────────────────
// GET /api/requests — Get requests (client: own, admin: all)
// ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('requests')
      .select('*, users:user_id(name, email)')
      .order('created_at', { ascending: false });

    // Clients only see their own requests
    if (req.user.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    // Filters
    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }
    if (req.query.type) {
      query = query.eq('type', req.query.type);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ requests: data });
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests.' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/requests — Create a request
// ───────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('type')
      .isIn(['add_room', 'remove_room', 'add_device', 'remove_device', 'change_board', 'other'])
      .withMessage('Invalid request type'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 1000 })
      .withMessage('Description too long (max 1000 chars)'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, description } = req.body;

      const { data, error } = await supabase
        .from('requests')
        .insert({
          user_id: req.user.id,
          type,
          description,
        })
        .select()
        .single();

      if (error) throw error;

      // Notify admin
      await supabase.from('notifications').insert({
        user_id: req.user.id, // We'll use admin ID in production
        title: '📋 New Request',
        message: `${req.user.name} submitted a "${type}" request.`,
        type: 'info',
      });

      res.status(201).json({ request: data });
    } catch (err) {
      console.error('Create request error:', err);
      res.status(500).json({ error: 'Failed to create request.' });
    }
  }
);

// ───────────────────────────────────────────────────────────
// PUT /api/requests/:id/status — Admin: approve/reject request
// ───────────────────────────────────────────────────────────
router.put(
  '/:id/status',
  adminMiddleware,
  [
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
    body('admin_note').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { status, admin_note } = req.body;

      const { data: request, error } = await supabase
        .from('requests')
        .update({ status, admin_note: admin_note || null })
        .eq('id', req.params.id)
        .select('*, users:user_id(name, email)')
        .single();

      if (error) throw error;

      // Send email to client
      if (request.users) {
        await sendRequestStatusEmail(
          request.users.email,
          request.users.name,
          request.type,
          status,
          admin_note
        );
      }

      // Create notification for client
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        title: status === 'approved' ? '✅ Request Approved' : '❌ Request Rejected',
        message: `Your "${request.type}" request has been ${status}.${admin_note ? ` Note: ${admin_note}` : ''}`,
        type: status === 'approved' ? 'info' : 'warning',
      });

      res.json({ request });
    } catch (err) {
      console.error('Update request status error:', err);
      res.status(500).json({ error: 'Failed to update request status.' });
    }
  }
);

module.exports = router;
