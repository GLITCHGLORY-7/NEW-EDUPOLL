const { supabase } = require('../database/db');

async function run() {
  console.log('Deleting student SEC25IT175 inserted by agent...');
  const { data, error } = await supabase
    .from('students')
    .delete()
    .eq('id', 'SEC25IT175');

  if (error) {
    console.error('Error deleting student:', error);
  } else {
    console.log('Successfully deleted student SEC25IT175 from database.');
  }
}

run();
