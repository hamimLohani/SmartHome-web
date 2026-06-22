// ═══════════════════════════════════════════════════════════
// ESP32 ROUTES — Board management
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/authMiddleware');
const { publishCommand } = require('../mqtt/mqttClient');

router.use(authMiddleware);

// MAC address regex: XX:XX:XX:XX:XX:XX
const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

// ───────────────────────────────────────────────────────────
// GET /api/esp32/room/:roomId — Get boards for a room
// ───────────────────────────────────────────────────────────
router.get('/room/:roomId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('esp32_boards')
      .select('*, devices(id, name, type, is_on)')
      .eq('room_id', req.params.roomId)
      .order('created_at');

    if (error) throw error;
    res.json({ boards: data });
  } catch (err) {
    console.error('Get ESP32 boards error:', err);
    res.status(500).json({ error: 'Failed to fetch boards.' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/esp32 — Register a new ESP32 board
// ───────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('room_id').isUUID().withMessage('Valid room ID is required'),
    body('mac_address')
      .matches(MAC_REGEX)
      .withMessage('Invalid MAC address format. Use XX:XX:XX:XX:XX:XX'),
    body('name').trim().notEmpty().withMessage('Board name is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { room_id, mac_address, name } = req.body;

      // Check if MAC is already registered
      const { data: existing } = await supabase
        .from('esp32_boards')
        .select('id')
        .eq('mac_address', mac_address.toUpperCase())
        .single();

      if (existing) {
        return res.status(409).json({ error: 'This MAC address is already registered.' });
      }

      const { data, error } = await supabase
        .from('esp32_boards')
        .insert({
          room_id,
          mac_address: mac_address.toUpperCase(),
          name,
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ board: data });
    } catch (err) {
      console.error('Register ESP32 error:', err);
      res.status(500).json({ error: 'Failed to register board.' });
    }
  }
);

// ───────────────────────────────────────────────────────────
// PUT /api/esp32/:id — Update board
// ───────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const allowedFields = ['name', 'mac_address', 'room_id'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'mac_address' && !MAC_REGEX.test(req.body[field])) {
          return res.status(400).json({ error: 'Invalid MAC address format.' });
        }
        updates[field] = field === 'mac_address' ? req.body[field].toUpperCase() : req.body[field];
      }
    }

    const { data, error } = await supabase
      .from('esp32_boards')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ board: data });
  } catch (err) {
    console.error('Update ESP32 error:', err);
    res.status(500).json({ error: 'Failed to update board.' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/esp32/:id/reboot — Send reboot command via MQTT
// ───────────────────────────────────────────────────────────
router.post('/:id/reboot', async (req, res) => {
  try {
    const { data: board } = await supabase
      .from('esp32_boards')
      .select('mac_address, name')
      .eq('id', req.params.id)
      .single();

    if (!board) {
      return res.status(404).json({ error: 'Board not found.' });
    }

    publishCommand(board.mac_address, 0, 'reboot', 1);

    res.json({ message: `Reboot command sent to "${board.name}" (${board.mac_address})` });
  } catch (err) {
    console.error('Reboot ESP32 error:', err);
    res.status(500).json({ error: 'Failed to send reboot command.' });
  }
});

// ───────────────────────────────────────────────────────────
// DELETE /api/esp32/:id — Remove board
// ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('esp32_boards')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Board removed successfully.' });
  } catch (err) {
    console.error('Delete ESP32 error:', err);
    res.status(500).json({ error: 'Failed to remove board.' });
  }
});

module.exports = router;
