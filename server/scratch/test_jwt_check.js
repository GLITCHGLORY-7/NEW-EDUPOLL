const jwt = require('jsonwebtoken');
const { supabase } = require('../database/db');
const { JWT_SECRET } = require('../middleware/auth');

async function test(studentId) {
  console.log(`Testing token verification for student ID: ${studentId}`);
  
  // 1. Check if student exists in DB using the exact verifyToken query
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('id', studentId)
    .limit(1);

  if (error) {
    console.error('Database query error:', error);
    return;
  }
  
  console.log('Query result:', data);
  if (!data || data.length === 0) {
    console.log('Verification failed: Student not found in database.');
  } else {
    console.log('Verification succeeded: Student found!');
  }
}

async function run() {
  await test('Sec25');
  await test('ADMIN001');
  await test('SEC25IT175');
}

run();
