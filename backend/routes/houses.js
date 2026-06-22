// ═══════════════════════════════════════════════════════════
// HOUSES ROUTES — CRUD for user houses
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// ───────────────────────────────────────────────────────────
// GET /api/houses — Get user's houses
// ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('houses')
      .select(`
        *,
        rooms (
          id, name, type, position_x, position_y, width, height, color,
          esp32_boards ( id, name, mac_address, is_online, last_seen ),
          devices ( id, name, type, is_on, value, pin_number, position_x, position_y, icon )
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ houses: data });
  } catch (err) {
    console.error('Get houses error:', err);
    res.status(500).json({ error: 'Failed to fetch houses.' });
  }
});

// ───────────────────────────────────────────────────────────
// GET /api/houses/:id — Get single house with full details
// ───────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('houses')
      .select(`
        *,
        rooms (
          *,
          esp32_boards ( * ),
          devices ( * )
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'House not found.' });
    }

    res.json({ house: data });
  } catch (err) {
    console.error('Get house error:', err);
    res.status(500).json({ error: 'Failed to fetch house.' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/houses — Create a new house
// ───────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('House name is required'),
    body('address').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, address } = req.body;

      const { data, error } = await supabase
        .from('houses')
        .insert({
          user_id: req.user.id,
          name,
          address: address || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ house: data });
    } catch (err) {
      console.error('Create house error:', err);
      res.status(500).json({ error: 'Failed to create house.' });
    }
  }
);

// ───────────────────────────────────────────────────────────
// PUT /api/houses/:id — Update house
// ───────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, address } = req.body;

    // Verify ownership
    const { data: existing } = await supabase
      .from('houses')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'House not found.' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (address !== undefined) updates.address = address;

    const { data, error } = await supabase
      .from('houses')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ house: data });
  } catch (err) {
    console.error('Update house error:', err);
    res.status(500).json({ error: 'Failed to update house.' });
  }
});

// ───────────────────────────────────────────────────────────
// DELETE /api/houses/:id — Delete house
// ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('houses')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'House not found.' });
    }

    const { error } = await supabase
      .from('houses')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'House deleted successfully.' });
  } catch (err) {
    console.error('Delete house error:', err);
    res.status(500).json({ error: 'Failed to delete house.' });
  }
});

module.exports = router;
