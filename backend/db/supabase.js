// ═══════════════════════════════════════════════════════════
// SUPABASE CLIENT — Database Connection
// ═══════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials not configured. Database operations will fail.');
  console.warn('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.');
}

// Use service_role key to bypass RLS on the backend
const supabase = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = supabase;
