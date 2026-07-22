const bcrypt = require('bcryptjs');
const { supabase } = require('../database/db');
const { login } = require('../controllers/authController');
const { getStudentProfile } = require('../controllers/studentAppController');

// Mock express req and res
function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.data = obj;
      return this;
    }
  };
  return res;
}

async function run() {
  console.log('--- STARTING STUDENT LOGIN FLOW TEST ---');
  
  const studentId = 'SEC25IT175';
  const plainPassword = 'SAIRAM_TEST_123';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  // 1. Insert the student temporarily (mocking Staff creation)
  console.log('1. Inserting temporary student SEC25IT175...');
  const { error: insertError } = await supabase
    .from('students')
    .insert([{
      id: studentId,
      name: 'Test Student',
      password: hashedPassword,
      classroom_id: 'CLASS-MRKPZABL38S',
      role: 'student',
      gender: 'Male'
    }]);

  if (insertError) {
    console.error('Failed to insert temporary student:', insertError);
    return;
  }

  try {
    // 2. Simulate Login Request
    console.log('2. Simulating Login request for SEC25IT175...');
    const loginReq = {
      body: {
        loginId: studentId,
        password: plainPassword
      }
    };
    const loginRes = mockResponse();
    await login(loginReq, loginRes);
    
    console.log('Login Response Status:', loginRes.statusCode);
    console.log('Login Response Data:', loginRes.data);
    
    if (loginRes.statusCode !== 200 || !loginRes.data.token) {
      throw new Error('Login failed!');
    }
    
    const token = loginRes.data.token;
    
    // 3. Verify token and fetch profile
    console.log('3. Simulating verifyToken middleware and getStudentProfile...');
    
    // Mock the decoded user info from token verification
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify using the middleware database query
    const { data: dbVerify } = await supabase
      .from('students')
      .select('id')
      .eq('id', decoded.id)
      .limit(1);
      
    if (!dbVerify || dbVerify.length === 0) {
      throw new Error('Token verification failed: Student not found in DB!');
    }
    console.log('Token verification check PASSED.');
    
    const profileReq = {
      user: decoded
    };
    const profileRes = mockResponse();
    await getStudentProfile(profileReq, profileRes);
    
    console.log('Profile Response Status:', profileRes.statusCode);
    console.log('Profile Response Data:', profileRes.data);
    
    if (profileRes.statusCode === 200) {
      console.log('--- TEST PASSED: STUDENT LOGIN FLOW WORKS 100% END-TO-END! ---');
    } else {
      throw new Error('Profile fetch failed!');
    }
    
  } catch (err) {
    console.error('--- TEST FAILED ---');
    console.error(err);
  } finally {
    // 4. Clean up student from DB
    console.log('4. Cleaning up temporary student SEC25IT175...');
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);
      
    if (deleteError) {
      console.error('Failed to clean up temporary student:', deleteError);
    } else {
      console.log('Database cleaned up successfully.');
    }
  }
}

run();
