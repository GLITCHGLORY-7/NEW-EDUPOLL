const { supabase } = require('../database/db');

async function run() {
  const { data } = await supabase.from('users').select('*').limit(2);
  console.log(JSON.stringify(data, null, 2));
}

run();
