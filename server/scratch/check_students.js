const { supabase } = require('../database/db');

async function run() {
  const { data } = await supabase.from('students').select('*').limit(1);
  console.log(JSON.stringify(data, null, 2));
}

run();
