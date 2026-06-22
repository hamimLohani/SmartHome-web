// ═══════════════════════════════════════════════════════════
// SENSORS ROUTES — Sensor readings and history
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ───────────────────────────────────────────────────────────
// GET /api/sensors/device/:deviceId — Get latest readings for a device
// ───────────────────────────────────────────────────────────
router.get('/device/:deviceId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1;

    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ readings: data });
  } catch (err) {
    console.error('Get sensor readings error:', err);
    res.status(500).json({ error: 'Failed to fetch sensor readings.' });
  }
});

// ───────────────────────────────────────────────────────────
// GET /api/sensors/device/:deviceId/history — Get reading history
// ───────────────────────────────────────────────────────────
router.get('/device/:deviceId/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    res.json({ readings: data, hours });
  } catch (err) {
    console.error('Get sensor history error:', err);
    res.status(500).json({ error: 'Failed to fetch sensor history.' });
  }
});

// ───────────────────────────────────────────────────────────
// GET /api/sensors/house/:houseId — Get all latest sensor readings for a house
// ───────────────────────────────────────────────────────────
router.get('/house/:houseId', async (req, res) => {
  try {
    // Get all sensor devices for this house
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id')
      .eq('house_id', req.params.houseId);

    if (!rooms || rooms.length === 0) {
      return res.json({ sensors: [] });
    }

    const roomIds = rooms.map((r) => r.id);

    const { data: devices } = await supabase
      .from('devices')
      .select('id, name, type, room_id, value, unit, rooms:room_id(name, type)')
      .in('room_id', roomIds)
      .in('type', ['temperature', 'humidity', 'gas', 'fire', 'motion']);

    if (!devices || devices.length === 0) {
      return res.json({ sensors: [] });
    }

    // Get latest reading for each sensor device
    const sensors = [];
    for (const device of devices) {
      const { data: reading } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('device_id', device.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      sensors.push({
        device,
        latestReading: reading || null,
      });
    }

    res.json({ sensors });
  } catch (err) {
    console.error('Get house sensors error:', err);
    res.status(500).json({ error: 'Failed to fetch sensor data.' });
  }
});

module.exports = router;
