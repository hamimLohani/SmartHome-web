-- ═══════════════════════════════════════════════════════════
-- SMART HOME MANAGEMENT — DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ───────────────────────────────────────────────────────────
-- 1. USERS
-- ───────────────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  verification_token_expires TIMESTAMP,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin')),
  avatar_url TEXT,
  last_active TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verification_token ON users(verification_token);

-- ───────────────────────────────────────────────────────────
-- 2. HOUSES
-- ───────────────────────────────────────────────────────────
CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_houses_user_id ON houses(user_id);

-- ───────────────────────────────────────────────────────────
-- 3. ROOMS
-- ───────────────────────────────────────────────────────────
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bedroom', 'kitchen', 'bathroom', 'living_room', 'garage', 'office', 'dining', 'hallway', 'other')),
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  width FLOAT DEFAULT 150,
  height FLOAT DEFAULT 150,
  color TEXT DEFAULT '#e0f2fe',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_rooms_house_id ON rooms(house_id);

-- ───────────────────────────────────────────────────────────
-- 4. ESP32 BOARDS
-- ───────────────────────────────────────────────────────────
CREATE TABLE esp32_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  mac_address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  ip_address TEXT,
  firmware_version TEXT DEFAULT '1.0.0',
  last_seen TIMESTAMP,
  is_online BOOLEAN DEFAULT false,
  signal_strength INT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_esp32_room_id ON esp32_boards(room_id);
CREATE INDEX idx_esp32_mac ON esp32_boards(mac_address);

-- ───────────────────────────────────────────────────────────
-- 5. DEVICES
-- ───────────────────────────────────────────────────────────
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES esp32_boards(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('light', 'fan', 'temperature', 'humidity', 'gas', 'fire', 'motion', 'relay', 'other')),
  pin_number INT NOT NULL,
  is_on BOOLEAN DEFAULT false,
  value FLOAT DEFAULT 0,
  min_value FLOAT DEFAULT 0,
  max_value FLOAT DEFAULT 100,
  unit TEXT,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_devices_board_id ON devices(board_id);
CREATE INDEX idx_devices_room_id ON devices(room_id);

-- ───────────────────────────────────────────────────────────
-- 6. SENSOR READINGS
-- ───────────────────────────────────────────────────────────
CREATE TABLE sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  temperature FLOAT,
  humidity FLOAT,
  gas_level FLOAT,
  fire_detected BOOLEAN DEFAULT false,
  motion_detected BOOLEAN DEFAULT false,
  raw_value FLOAT,
  recorded_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_sensor_device_id ON sensor_readings(device_id);
CREATE INDEX idx_sensor_recorded_at ON sensor_readings(recorded_at);

-- ───────────────────────────────────────────────────────────
-- 7. AUTOMATION RULES
-- ───────────────────────────────────────────────────────────
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_device_id UUID REFERENCES devices(id),
  trigger_condition TEXT CHECK (trigger_condition IN ('greater_than', 'less_than', 'equals', 'not_equals', 'detected')),
  trigger_value FLOAT,
  action_device_id UUID REFERENCES devices(id),
  action_type TEXT CHECK (action_type IN ('turn_on', 'turn_off', 'set_value', 'toggle')),
  action_value FLOAT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_automation_house_id ON automation_rules(house_id);

-- ───────────────────────────────────────────────────────────
-- 8. DEVICE SCHEDULES
-- ───────────────────────────────────────────────────────────
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('turn_on', 'turn_off', 'set_value')),
  value FLOAT,
  scheduled_time TIME NOT NULL,
  days_of_week TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_schedules_device_id ON schedules(device_id);

-- ───────────────────────────────────────────────────────────
-- 9. REQUESTS (client → admin)
-- ───────────────────────────────────────────────────────────
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('add_room', 'remove_room', 'add_device', 'remove_device', 'change_board', 'other')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_status ON requests(status);

-- ───────────────────────────────────────────────────────────
-- 10. COMPLAINTS
-- ───────────────────────────────────────────────────────────
CREATE TABLE complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_reply TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_complaints_user_id ON complaints(user_id);
CREATE INDEX idx_complaints_status ON complaints(status);

-- ───────────────────────────────────────────────────────────
-- 11. MESSAGES
-- ───────────────────────────────────────────────────────────
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);

-- ───────────────────────────────────────────────────────────
-- 12. DEVICE LOGS (audit trail)
-- ───────────────────────────────────────────────────────────
CREATE TABLE device_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  triggered_by TEXT DEFAULT 'user' CHECK (triggered_by IN ('user', 'automation', 'schedule', 'mqtt', 'system')),
  logged_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_device_logs_device_id ON device_logs(device_id);

-- ───────────────────────────────────────────────────────────
-- 13. NOTIFICATIONS
-- ───────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'danger', 'emergency')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ═══════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE esp32_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Note: Since we use the Supabase service_role key on the backend,
-- RLS is bypassed for server-side operations. These policies are
-- for any direct Supabase client usage from the frontend.

-- Users: can read own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Houses: users can only see their own houses
CREATE POLICY "Users can view own houses" ON houses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own houses" ON houses
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Rooms: users can see rooms in their houses
CREATE POLICY "Users can view own rooms" ON rooms
  FOR SELECT USING (
    house_id IN (SELECT id FROM houses WHERE user_id = auth.uid())
  );

-- ESP32 Boards: users can see boards in their rooms
CREATE POLICY "Users can view own boards" ON esp32_boards
  FOR SELECT USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN houses h ON r.house_id = h.id
      WHERE h.user_id = auth.uid()
    )
  );

-- Devices: users can see devices in their rooms
CREATE POLICY "Users can view own devices" ON devices
  FOR SELECT USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN houses h ON r.house_id = h.id
      WHERE h.user_id = auth.uid()
    )
  );

-- Sensor Readings: users can see readings from their devices
CREATE POLICY "Users can view own sensor readings" ON sensor_readings
  FOR SELECT USING (
    device_id IN (
      SELECT d.id FROM devices d
      JOIN rooms r ON d.room_id = r.id
      JOIN houses h ON r.house_id = h.id
      WHERE h.user_id = auth.uid()
    )
  );

-- Requests: users can view and create their own requests
CREATE POLICY "Users can view own requests" ON requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create requests" ON requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Complaints: users can view and create their own complaints
CREATE POLICY "Users can view own complaints" ON complaints
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create complaints" ON complaints
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Messages: users can see messages they sent or received
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Notifications: users can see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Automation Rules: users can manage rules for their houses
CREATE POLICY "Users can view own automation rules" ON automation_rules
  FOR SELECT USING (
    house_id IN (SELECT id FROM houses WHERE user_id = auth.uid())
  );

-- Schedules: users can manage schedules for their devices
CREATE POLICY "Users can view own schedules" ON schedules
  FOR SELECT USING (
    device_id IN (
      SELECT d.id FROM devices d
      JOIN rooms r ON d.room_id = r.id
      JOIN houses h ON r.house_id = h.id
      WHERE h.user_id = auth.uid()
    )
  );

-- Device Logs: users can view logs for their devices
CREATE POLICY "Users can view own device logs" ON device_logs
  FOR SELECT USING (
    device_id IN (
      SELECT d.id FROM devices d
      JOIN rooms r ON d.room_id = r.id
      JOIN houses h ON r.house_id = h.id
      WHERE h.user_id = auth.uid()
    )
  );
