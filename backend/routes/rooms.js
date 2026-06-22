// ═══════════════════════════════════════════════════════════
// ROOMS ROUTES — CRUD for rooms within houses
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Helper: verify user owns the house
async function verifyHouseOwnership(houseId, userId) {
  const { data } = await supabase
    .from('houses')
    .select('id')
    .eq('id', houseId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

// ───────────────────────────────────────────────────────────
// GET /api/rooms/:houseId — Get all rooms for a house
// ───────────────────────────────────────────────────────────
router.get('/:houseId', async (req, res) => {
  try {
    if (!(await verifyHouseOwnership(req.params.houseId, req.user.id))) {
      return res.status(404).json({ error: 'House not found.' });
    }

    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        esp32_boards ( * ),
        devices ( * )
      `)
      .eq('house_id', req.params.houseId)
      .order('created_at');

    if (error) throw error;
    res.json({ rooms: data });
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ error: 'Failed to fetch rooms.' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/rooms — Create a room
// ───────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('house_id').isUUID().withMessage('Valid house ID is required'),
    body('name').trim().notEmpty().withMessage('Room name is required'),
    body('type').isIn(['bedroom', 'kitchen', 'bathroom', 'living_room', 'garage', 'office', 'dining', 'hallway', 'other'])
      .withMessage('Invalid room type'),
    body('position_x').optional().isFloat(),
    body('position_y').optional().isFloat(),
    body('width').optional().isFloat({ min: 50 }),
    body('height').optional().isFloat({ min: 50 }),
    body('color').optional().matches(/^#[0-9a-fA-F]{6}$/),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { house_id, name, type, position_x, position_y, width, height, color } = req.body;

      if (!(await verifyHouseOwnership(house_id, req.user.id))) {
        return res.status(404).json({ error: 'House not found.' });
      }

      // Default colors by room type
      const typeColors = {
        bedroom: '#bfdbfe',
        kitchen: '#fed7aa',
        bathroom: '#99f6e4',
        living_room: '#bbf7d0',
        garage: '#e5e7eb',
        office: '#c7d2fe',
        dining: '#fde68a',
        hallway: '#f3e8ff',
        other: '#e0f2fe',
      };

      const { data, error } = await supabase
        .from('rooms')
        .insert({
          house_id,
          name,
          type,
          position_x: position_x || 0,
          position_y: position_y || 0,
          width: width || 150,
          height: height || 150,
          color: color || typeColors[type] || '#e0f2fe',
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ room: data });
    } catch (err) {
      console.error('Create room error:', err);
      res.status(500).json({ error: 'Failed to create room.' });
    }
  }
);

// ───────────────────────────────────────────────────────────
// PUT /api/rooms/:id — Update room (position, size, name, etc.)
// ───────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    // Verify ownership through house
    const { data: room } = await supabase
      .from('rooms')
      .select('id, house_id, houses!inner(user_id)')
      .eq('id', req.params.id)
      .single();

    if (!room || room.houses.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const allowedFields = ['name', 'type', 'position_x', 'position_y', 'width', 'height', 'color'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const { data, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ room: data });
  } catch (err) {
    console.error('Update room error:', err);
    res.status(500).json({ error: 'Failed to update room.' });
  }
});

// ───────────────────────────────────────────────────────────
// PUT /api/rooms/batch/positions — Batch update room positions
// ───────────────────────────────────────────────────────────
router.put('/batch/positions', async (req, res) => {
  try {
    const { rooms } = req.body; // [{ id, position_x, position_y, width, height }]

    if (!Array.isArray(rooms)) {
      return res.status(400).json({ error: 'Rooms array is required.' });
    }

    const results = [];
    for (const room of rooms) {
      const { data, error } = await supabase
        .from('rooms')
        .update({
          position_x: room.position_x,
          position_y: room.position_y,
          width: room.width,
          height: room.height,
        })
        .eq('id', room.id)
        .select()
        .single();

      if (!error) results.push(data);
    }

    res.json({ rooms: results });
  } catch (err) {
    console.error('Batch update rooms error:', err);
    res.status(500).json({ error: 'Failed to update rooms.' });
  }
});

// ───────────────────────────────────────────────────────────
// DELETE /api/rooms/:id — Delete room
// ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { data: room } = await supabase
      .from('rooms')
      .select('id, house_id, houses!inner(user_id)')
      .eq('id', req.params.id)
      .single();

    if (!room || room.houses.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Room deleted successfully.' });
  } catch (err) {
    console.error('Delete room error:', err);
    res.status(500).json({ error: 'Failed to delete room.' });
  }
});

module.exports = router;
