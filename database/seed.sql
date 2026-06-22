-- ═══════════════════════════════════════════════════════════
-- SMART HOME — SEED DATA
-- Run after schema.sql
-- ═══════════════════════════════════════════════════════════

-- Default admin user
-- Email: admin@smarthome.com
-- Password: Admin@1234 (bcrypt hashed with 12 salt rounds)
INSERT INTO users (id, email, password_hash, name, phone, is_verified, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@smarthome.com',
  '$2b$12$LJ3m4ys3uz0bTMqGOjHPaOhMYSMV1JbGDBGfMHCdW7mMcPNqBaGGi',
  'System Admin',
  '+1234567890',
  true,
  'admin'
);

-- Note: The password hash above is for "Admin@1234"
-- You can generate a new hash using the backend's /api/auth/create-admin endpoint
-- or by running: node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword', 12).then(console.log)"
