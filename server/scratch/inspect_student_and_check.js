const { supabase } = require('../database/db');

async function run() {
  console.log('Querying students for SEC25IT175...');
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .ilike('id', 'SEC25IT175');

  if (error) {
    console.error('Error fetching student:', error);
  } else {
    console.log('Found students:', data);
  }
}

run();
