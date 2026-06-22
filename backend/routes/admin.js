// ═══════════════════════════════════════════════════════════
// ADMIN ROUTES — Dashboard stats, client management, email
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { sendBroadcastEmail, sendMail } = require('../mail/mailer');

router.use(authMiddleware);
router.use(adminMiddleware);

// ───────────────────────────────────────────────────────────
// GET /api/admin/stats — Dashboard statistics
// ───────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [
      { count: totalClients },
      { count: totalDevices },
      { count: onlineBoards },
      { count: totalBoards },
      { count: pendingRequests },
      { count: openComplaints },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'client'),
      supabase.from('devices').select('id', { count: 'exact', head: true }),
      supabase.from('esp32_boards').select('id', { count: 'exact', head: true }).eq('is_online', true),
      supabase.from('esp32_boards').select('id', { count: 'exact', head: true }),
      supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('complaints').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    ]);

    res.json({
      stats: {
        totalClients: totalClients || 0,
        totalDevices: totalDevices || 0,
        onlineBoards: onlineBoards || 0,
        totalBoards: totalBoards || 0,
        pendingRequests: pendingRequests || 0,
        openComplaints: openComplaints || 0,
      },
    });
  } catch (err) {
    console.error('Get admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ───────────────────────────────────────────────────────────
// GET /api/admin/clients — List all clients with house info
// ───────────────────────────────────────────────────────────
router.get('/clients', async (req, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('users')
      .select(`
        id, name, email, phone, is_verified, last_active, created_at,
        houses (
          id, name, status,
          rooms ( id, name, type )
        )
      `)
      .eq('role', 'client')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrich with device counts and board status
    const enrichedClients = await Promise.all(
      (clients || []).map(async (client) => {
        let deviceCount = 0;
        let onlineBoards = 0;
        let totalBoards = 0;

        for (const house of (client.houses || [])) {
          for (const room of (house.rooms || [])) {
            const { count: devices } = await supabase
              .from('devices')
              .select('id', { count: 'exact', head: true })
              .eq('room_id', room.id);
            deviceCount += devices || 0;

            const { data: boards } = await supabase
              .from('esp32_boards')
              .select('is_online')
              .eq('room_id', room.id);

            totalBoards += (boards || []).length;
            onlineBoards += (boards || []).filter((b) => b.is_online).length;
          }
        }

        return {
          ...client,
          roomsCount: (client.houses || []).reduce((sum, h) => sum + (h.rooms || []).length, 0),
          deviceCount,
          onlineBoards,
          totalBoards,
        };
      })
    );

    res.json({ clients: enrichedClients });
  } catch (err) {
    console.error('Get clients error:', err);
    res.status(500).json({ error: 'Failed to fetch clients.' });
  }
});

// ───────────────────────────────────────────────────────────
// GET /api/admin/clients/:id/house — View client's house map
// ───────────────────────────────────────────────────────────
router.get('/clients/:id/house', async (req, res) => {
  try {
    const { data: houses, error } = await supabase
      .from('houses')
      .select(`
        *,
        rooms (
          *,
          esp32_boards ( * ),
          devices ( * )
        )
      `)
      .eq('user_id', req.params.id);

    if (error) throw error;
    res.json({ houses: houses || [] });
  } catch (err) {
    console.error('Get client house error:', err);
    res.status(500).json({ error: 'Failed to fetch client house.' });
  }
});

// ───────────────────────────────────────────────────────────
// PUT /api/admin/houses/:id/status — Approve/reject house
// ───────────────────────────────────────────────────────────
router.put('/houses/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected.' });
    }

    const { data, error } = await supabase
      .from('houses')
      .update({ status })
      .eq('id', req.params.id)
      .select('*, users:user_id(name, email)')
      .single();

    if (error) throw error;

    // Notify user
    if (data.user_id) {
      await supabase.from('notifications').insert({
        user_id: data.user_id,
        title: status === 'approved' ? '✅ House Approved' : '❌ House Rejected',
        message: `Your house "${data.name}" has been ${status} by admin.`,
        type: status === 'approved' ? 'info' : 'warning',
      });
    }

    res.json({ house: data });
  } catch (err) {
    console.error('Update house status error:', err);
    res.status(500).json({ error: 'Failed to update house status.' });
  }
});

// ───────────────────────────────────────────────────────────
// GET /api/admin/esp32 — All ESP32 boards with status
// ───────────────────────────────────────────────────────────
router.get('/esp32', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('esp32_boards')
      .select(`
        *,
        rooms:room_id (
          name, type,
          houses:house_id ( name, users:user_id ( name, email ) )
        ),
        devices ( id, name, type, is_on )
      `)
      .order('last_seen', { ascending: false, nullsFirst: false });

    if (error) throw error;
    res.json({ boards: data });
  } catch (err) {
    console.error('Get all ESP32 boards error:', err);
    res.status(500).json({ error: 'Failed to fetch boards.' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/admin/email — Send email to individual or broadcast
// ───────────────────────────────────────────────────────────
router.post(
  '/email',
  [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('to').optional().isEmail().withMessage('Invalid email address'),
    body('broadcast').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { subject, content, to, broadcast } = req.body;

      if (broadcast) {
        // Send to all clients
        const { data: clients } = await supabase
          .from('users')
          .select('email')
          .eq('role', 'client')
          .eq('is_verified', true);

        const emails = (clients || []).map((c) => c.email);
        const results = await sendBroadcastEmail(emails, subject, content);

        res.json({
          message: `Broadcast sent to ${results.filter((r) => r.success).length}/${emails.length} clients.`,
          results,
        });
      } else if (to) {
        await sendMail(to, subject, `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #0ea5e9, #6366f1); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white;">🏠 Smart Home</h1>
            </div>
            <div style="padding: 30px; line-height: 1.7;">${content}</div>
            <div style="background: #1e293b; padding: 20px; text-align: center;">
              <p style="margin: 0; color: #475569; font-size: 12px;">© ${new Date().getFullYear()} Smart Home</p>
            </div>
          </div>
        `);
        res.json({ message: `Email sent to ${to}` });
      } else {
        return res.status(400).json({ error: 'Specify "to" email or set "broadcast" to true.' });
      }
    } catch (err) {
      console.error('Send email error:', err);
      res.status(500).json({ error: 'Failed to send email.' });
    }
  }
);

// ───────────────────────────────────────────────────────────
// GET /api/admin/notifications — Get all notifications
// ───────────────────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, users:user_id(name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ notifications: data });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

module.exports = router;
