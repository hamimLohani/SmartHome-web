// ═══════════════════════════════════════════════════════════
// MESSAGES ROUTES — Chat system
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ───────────────────────────────────────────────────────────
// GET /api/messages/conversations — Get conversation list
// ───────────────────────────────────────────────────────────
router.get('/conversations', async (req, res) => {
  try {
    // Get unique conversation partners
    const { data: sent } = await supabase
      .from('messages')
      .select('receiver_id, created_at')
      .eq('sender_id', req.user.id)
      .order('created_at', { ascending: false });

    const { data: received } = await supabase
      .from('messages')
      .select('sender_id, created_at')
      .eq('receiver_id', req.user.id)
      .order('created_at', { ascending: false });

    // Build unique partner map with last message time
    const partners = new Map();
    for (const msg of (sent || [])) {
      if (!partners.has(msg.receiver_id)) {
        partners.set(msg.receiver_id, msg.created_at);
      }
    }
    for (const msg of (received || [])) {
      if (!partners.has(msg.sender_id) || partners.get(msg.sender_id) < msg.created_at) {
        partners.set(msg.sender_id, msg.created_at);
      }
    }

    // Get partner details
    const partnerIds = Array.from(partners.keys());
    if (partnerIds.length === 0) {
      return res.json({ conversations: [] });
    }

    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, role')
      .in('id', partnerIds);

    // Get unread counts
    const conversations = await Promise.all(
      (users || []).map(async (user) => {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', user.id)
          .eq('receiver_id', req.user.id)
          .eq('is_read', false);

        // Get last message
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .or(`sender_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          user,
          unreadCount: count || 0,
          lastMessage: lastMsg,
          lastActivity: partners.get(user.id),
        };
      })
    );

    // Sort by last activity
    conversations.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    res.json({ conversations });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// ───────────────────────────────────────────────────────────
// GET /api/messages/admin — Return the admin user ID
// ───────────────────────────────────────────────────────────
router.get('/admin', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .single();
    if (error || !data) return res.json({ adminId: null });
    res.json({ adminId: data.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get admin.' });
  }
});

// ───────────────────────────────────────────────────────────
// GET /api/messages/:userId — Get messages with a specific user
// ───────────────────────────────────────────────────────────
router.get('/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${req.user.id},receiver_id.eq.${req.params.userId}),and(sender_id.eq.${req.params.userId},receiver_id.eq.${req.user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Mark received messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', req.params.userId)
      .eq('receiver_id', req.user.id)
      .eq('is_read', false);

    res.json({ messages: data });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/messages — Send a message
// ───────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('receiver_id').isUUID().withMessage('Valid receiver ID required'),
    body('content').trim().notEmpty().withMessage('Message content is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { receiver_id, content } = req.body;

      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: req.user.id,
          receiver_id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for receiver
      await supabase.from('notifications').insert({
        user_id: receiver_id,
        title: '💬 New Message',
        message: `${req.user.name} sent you a message.`,
        type: 'info',
      });

      res.status(201).json({ message: data });
    } catch (err) {
      console.error('Send message error:', err);
      res.status(500).json({ error: 'Failed to send message.' });
    }
  }
);

module.exports = router;
