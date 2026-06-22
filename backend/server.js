// ═══════════════════════════════════════════════════════════
// SMART HOME BACKEND — Express Server
// ═══════════════════════════════════════════════════════════

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const supabase = require('./db/supabase');
const { initMQTT } = require('./mqtt/mqttClient');
const { initMailer } = require('./mail/mailer');

const app = express();
const PORT = process.env.PORT || 5000;

// ───────────────────────────────────────────────────────────
// MIDDLEWARE
// ───────────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS — allow frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// ───────────────────────────────────────────────────────────
// ROUTES
// ───────────────────────────────────────────────────────────

app.use('/api/auth', require('./routes/auth'));
app.use('/api/houses', require('./routes/houses'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/esp32', require('./routes/esp32'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));

// Notifications route (authenticated)
const authMiddleware = require('./middleware/authMiddleware');

app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ notifications: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

app.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
});

// Automation rules routes
app.get('/api/automations/:houseId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*, trigger_device:trigger_device_id(name, type), action_device:action_device_id(name, type)')
      .eq('house_id', req.params.houseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ automations: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch automations.' });
  }
});

app.post('/api/automations', authMiddleware, async (req, res) => {
  try {
    const { house_id, name, trigger_device_id, trigger_condition, trigger_value, action_device_id, action_type, action_value } = req.body;

    const { data, error } = await supabase
      .from('automation_rules')
      .insert({ house_id, name, trigger_device_id, trigger_condition, trigger_value, action_device_id, action_type, action_value })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ automation: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create automation.' });
  }
});

app.delete('/api/automations/:id', authMiddleware, async (req, res) => {
  try {
    await supabase.from('automation_rules').delete().eq('id', req.params.id);
    res.json({ message: 'Automation deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete automation.' });
  }
});

// Schedules routes
app.get('/api/schedules/device/:deviceId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .order('scheduled_time');

    if (error) throw error;
    res.json({ schedules: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedules.' });
  }
});

app.post('/api/schedules', authMiddleware, async (req, res) => {
  try {
    const { device_id, action, value, scheduled_time, days_of_week } = req.body;

    const { data, error } = await supabase
      .from('schedules')
      .insert({ device_id, action, value, scheduled_time, days_of_week })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ schedule: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create schedule.' });
  }
});

app.delete('/api/schedules/:id', authMiddleware, async (req, res) => {
  try {
    await supabase.from('schedules').delete().eq('id', req.params.id);
    res.json({ message: 'Schedule deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete schedule.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ───────────────────────────────────────────────────────────
// ERROR HANDLING
// ───────────────────────────────────────────────────────────

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ───────────────────────────────────────────────────────────
// CRON JOBS
// ───────────────────────────────────────────────────────────

// Check ESP32 boards offline status every minute
cron.schedule('* * * * *', async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    await supabase
      .from('esp32_boards')
      .update({ is_online: false })
      .lt('last_seen', fiveMinutesAgo)
      .eq('is_online', true);
  } catch (err) {
    console.error('Cron: offline check error:', err.message);
  }
});

// Process schedules every minute
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[now.getDay()];

    const { data: schedules } = await supabase
      .from('schedules')
      .select('*, devices:device_id(id, board_id, pin_number, esp32_boards:board_id(mac_address))')
      .eq('scheduled_time', currentTime)
      .eq('is_active', true)
      .contains('days_of_week', [today]);

    if (!schedules || schedules.length === 0) return;

    const { publishCommand } = require('./mqtt/mqttClient');

    for (const schedule of schedules) {
      const device = schedule.devices;
      if (!device) continue;

      const newIsOn = schedule.action === 'turn_on' || (schedule.action === 'set_value' && schedule.value > 0);
      const newValue = schedule.action === 'turn_off' ? 0 : (schedule.value || 100);

      await supabase
        .from('devices')
        .update({ is_on: newIsOn, value: newValue })
        .eq('id', device.id);

      if (device.esp32_boards) {
        publishCommand(device.esp32_boards.mac_address, device.pin_number, schedule.action, newValue);
      }

      await supabase.from('device_logs').insert({
        device_id: device.id,
        action: `Schedule: ${schedule.action} (${newValue})`,
        old_value: null,
        new_value: `${newIsOn ? 'ON' : 'OFF'} (${newValue})`,
        triggered_by: 'schedule',
      });
    }
  } catch (err) {
    console.error('Cron: schedule processing error:', err.message);
  }
});

// ───────────────────────────────────────────────────────────
// START SERVER
// ───────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🏠 Smart Home Backend running on port ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);

  // Initialize services
  initMailer();
  initMQTT();

  console.log('📋 Services initialized\n');
});

module.exports = app;
