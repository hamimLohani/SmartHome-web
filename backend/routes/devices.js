// ═══════════════════════════════════════════════════════════
// DEVICES ROUTES — CRUD + Control
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/authMiddleware');
const { publishCommand } = require('../mqtt/mqttClient');

router.use(authMiddleware);

// ───────────────────────────────────────────────────────────
// GET /api/devices/room/:roomId — Get devices for a room
// ───────────────────────────────────────────────────────────
router.get('/room/:roomId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        esp32_boards:board_id ( name, mac_address, is_online )
      `)
      .eq('room_id', req.params.roomId)
      .order('created_at');

    if (error) throw error;
    res.json({ devices: data });
  } catch (err) {
    console.error('Get devices error:', err);
    res.status(500).json({ error: 'Failed to fetch devices.' });
  }
});

// ───────────────────────────────────────────────────────────
// GET /api/devices/house/:houseId — Get all devices for a house
// ───────────────────────────────────────────────────────────
router.get('/house/:houseId', async (req, res) => {
  try {
    // Get all rooms for this house first
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name, type')
      .eq('house_id', req.params.houseId);

    if (!rooms || rooms.length === 0) {
      return res.json({ devices: [], rooms: [] });
    }

    const roomIds = rooms.map((r) => r.id);

    const { data: devices, error } = await supabase
      .from('devices')
      .select(`
        *,
        esp32_boards:board_id ( name, mac_address, is_online ),
        rooms:room_id ( name, type )
      `)
      .in('room_id', roomIds)
      .order('room_id');

    if (error) throw error;
    res.json({ devices, rooms });
  } catch (err) {
    console.error('Get house devices error:', err);
    res.status(500).json({ error: 'Failed to fetch devices.' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/devices — Create a device
// ───────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('board_id').isUUID().withMessage('Valid board ID is required'),
    body('room_id').isUUID().withMessage('Valid room ID is required'),
    body('name').trim().notEmpty().withMessage('Device name is required'),
    body('type').isIn(['light', 'fan', 'temperature', 'humidity', 'gas', 'fire', 'motion', 'relay', 'other'])
      .withMessage('Invalid device type'),
    body('pin_number').isInt({ min: 0, max: 40 }).withMessage('Pin number must be 0-40'),
    body('position_x').optional().isFloat(),
    body('position_y').optional().isFloat(),
    body('icon').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { board_id, room_id, name, type, pin_number, position_x, position_y, icon } = req.body;

      // Check for pin conflict on the same board
      const { data: conflict } = await supabase
        .from('devices')
        .select('id, name')
        .eq('board_id', board_id)
        .eq('pin_number', pin_number)
        .single();

      if (conflict) {
        return res.status(409).json({
          error: `Pin ${pin_number} is already assigned to "${conflict.name}" on this board.`,
        });
      }

      // Set default units based on type
      const typeUnits = {
        temperature: '°C',
        humidity: '%',
        gas: '%',
        fan: '%',
        light: '%',
      };

      const { data, error } = await supabase
        .from('devices')
        .insert({
          board_id,
          room_id,
          name,
          type,
          pin_number,
          position_x: position_x || 0,
          position_y: position_y || 0,
          icon: icon || null,
          unit: typeUnits[type] || null,
          min_value: 0,
          max_value: type === 'fan' || type === 'light' ? 100 : (type === 'temperature' ? 60 : 100),
        })
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ device: data });
    } catch (err) {
      console.error('Create device error:', err);
      res.status(500).json({ error: 'Failed to create device.' });
    }
  }
);

// ───────────────────────────────────────────────────────────
// PUT /api/devices/:id — Update device
// ───────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const allowedFields = ['name', 'type', 'pin_number', 'position_x', 'position_y', 'icon', 'min_value', 'max_value', 'unit'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const { data, error } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ device: data });
  } catch (err) {
    console.error('Update device error:', err);
    res.status(500).json({ error: 'Failed to update device.' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/devices/:id/control — Control a device (toggle, set value)
// ───────────────────────────────────────────────────────────
router.post('/:id/control', async (req, res) => {
  try {
    const { action, value } = req.body; // action: 'toggle', 'on', 'off', 'set_value'

    // Get device with board info
    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select(`
        *,
        esp32_boards:board_id ( mac_address, is_online )
      `)
      .eq('id', req.params.id)
      .single();

    if (fetchError || !device) {
      return res.status(404).json({ error: 'Device not found.' });
    }

    let newIsOn = device.is_on;
    let newValue = device.value;

    switch (action) {
      case 'toggle':
        newIsOn = !device.is_on;
        newValue = newIsOn ? (device.value || 100) : 0;
        break;
      case 'on':
        newIsOn = true;
        newValue = value !== undefined ? value : 100;
        break;
      case 'off':
        newIsOn = false;
        newValue = 0;
        break;
      case 'set_value':
        newValue = Math.max(device.min_value, Math.min(device.max_value, value || 0));
        newIsOn = newValue > 0;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action. Use: toggle, on, off, set_value' });
    }

    // Update device in database
    const { data: updated, error: updateError } = await supabase
      .from('devices')
      .update({ is_on: newIsOn, value: newValue })
      .eq('id', device.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Send MQTT command to ESP32
    if (device.esp32_boards) {
      publishCommand(
        device.esp32_boards.mac_address,
        device.pin_number,
        action,
        newValue
      );
    }

    // Log the action
    await supabase.from('device_logs').insert({
      device_id: device.id,
      user_id: req.user.id,
      action: `${action} → ${newIsOn ? 'ON' : 'OFF'} (${newValue})`,
      old_value: `${device.is_on ? 'ON' : 'OFF'} (${device.value})`,
      new_value: `${newIsOn ? 'ON' : 'OFF'} (${newValue})`,
      triggered_by: 'user',
    });

    res.json({ device: updated });
  } catch (err) {
    console.error('Control device error:', err);
    res.status(500).json({ error: 'Failed to control device.' });
  }
});

// ───────────────────────────────────────────────────────────
// GET /api/devices/:id/logs — Device activity log
// ───────────────────────────────────────────────────────────
router.get('/:id/logs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('device_logs')
      .select('*')
      .eq('device_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ logs: data });
  } catch (err) {
    console.error('Get device logs error:', err);
    res.status(500).json({ error: 'Failed to fetch device logs.' });
  }
});

// ───────────────────────────────────────────────────────────
// DELETE /api/devices/:id — Delete device
// ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Device deleted successfully.' });
  } catch (err) {
    console.error('Delete device error:', err);
    res.status(500).json({ error: 'Failed to delete device.' });
  }
});

module.exports = router;
