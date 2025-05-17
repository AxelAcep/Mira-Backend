const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // harus pakai SERVICE ROLE agar bisa buat folder
);

module.exports = supabase;
