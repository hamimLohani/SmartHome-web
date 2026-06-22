// ═══════════════════════════════════════════════════════════
// CREATE ADMIN SCRIPT — Run with: npm run create-admin
// ═══════════════════════════════════════════════════════════

require('dotenv').config();
const bcrypt = require('bcrypt');
const supabase = require('../db/supabase');

async function createAdmin() {
  const email = 'admin@smarthome.com';
  const password = 'Admin@1234';
  const name = 'System Admin';

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
      .from('users')
      .upsert({
        email,
        password_hash: passwordHash,
        name,
        phone: '+1234567890',
        is_verified: true,
        role: 'admin',
      }, { onConflict: 'email' })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Admin user created/updated:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   ID: ${data.id}`);
  } catch (err) {
    console.error('❌ Failed to create admin:', err.message);
  }
  process.exit(0);
}

createAdmin();
