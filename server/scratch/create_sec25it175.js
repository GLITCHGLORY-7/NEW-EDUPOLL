const { supabase } = require('../database/db');
const bcrypt = require('bcryptjs');

async function run() {
  const hashedPassword = await bcrypt.hash('SAIRAM123', 10);
  
  // Find a classroom first
  const { data: classrooms } = await supabase.from('classrooms').select('id');
  const classroomId = classrooms && classrooms.length > 0 ? classrooms[0].id : null;
  
  console.log('Inserting student SEC25IT175 into classroom:', classroomId);

  const { data, error } = await supabase
    .from('students')
    .insert([{
      id: 'SEC25IT175',
      name: 'SEC25IT175',
      password: hashedPassword,
      department: 'IT',
      year: '2',
      section: 'A',
      classroom_id: classroomId,
      role: 'student',
      gender: 'Male'
    }])
    .select();

  if (error) {
    console.error('Error inserting student:', error);
  } else {
    console.log('Successfully created student:', data);
  }
}

run();
