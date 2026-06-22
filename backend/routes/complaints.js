// ═══════════════════════════════════════════════════════════
// COMPLAINTS ROUTES — Ticket system
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

router.use(authMiddleware);

// ───────────────────────────────────────────────────────────
// GET /api/complaints — Get complaints
// ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('complaints')
      .select('*, users:user_id(name, email)')
      .order('created_at', { ascending: false });

    if (req.user.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.priority) query = query.eq('priority', req.query.priority);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ complaints: data });
  } catch (err) {
    console.error('Get complaints error:', err);
    res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/complaints — Create a complaint
// ───────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Invalid priority level'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { subject, message, priority } = req.body;

      const { data, error } = await supabase
        .from('complaints')
        .insert({
          user_id: req.user.id,
          subject,
          message,
          priority: priority || 'normal',
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ complaint: data });
    } catch (err) {
      console.error('Create complaint error:', err);
      res.status(500).json({ error: 'Failed to create complaint.' });
    }
  }
);

// ───────────────────────────────────────────────────────────
// PUT /api/complaints/:id — Admin: update status/reply
// ───────────────────────────────────────────────────────────
router.put(
  '/:id',
  adminMiddleware,
  async (req, res) => {
    try {
      const { status, admin_reply, priority } = req.body;
      const updates = {};

      if (status) updates.status = status;
      if (admin_reply) updates.admin_reply = admin_reply;
      if (priority) updates.priority = priority;

      const { data, error } = await supabase
        .from('complaints')
        .update(updates)
        .eq('id', req.params.id)
        .select('*, users:user_id(name, email)')
        .single();

      if (error) throw error;

      // Notify client
      if (data.user_id) {
        await supabase.from('notifications').insert({
          user_id: data.user_id,
          title: '💬 Complaint Update',
          message: admin_reply
            ? `Admin replied to your complaint "${data.subject}": ${admin_reply}`
            : `Your complaint "${data.subject}" status changed to ${status}.`,
          type: 'info',
        });
      }

      res.json({ complaint: data });
    } catch (err) {
      console.error('Update complaint error:', err);
      res.status(500).json({ error: 'Failed to update complaint.' });
    }
  }
);

module.exports = router;
