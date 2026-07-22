const { supabase } = require('../database/db');

async function run() {
  console.log('Querying all students...');
  const { data, error } = await supabase
    .from('students')
    .select('*');

  if (error) {
    console.error('Error fetching students:', error);
  } else {
    console.log('Students in database:', data);
  }
}

run();
