const { supabase } = require('../database/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'poolsync-super-secret-key';

async function run() {
  const loginId = "ADMIN001"; // or whatever user
  
  // 1. Simulate login
  const { data: students } = await supabase
    .from('students')
    .select('*')
    .ilike('id', loginId);
    
  if (!students || students.length === 0) {
    console.log("No student found");
    return;
  }
  
  const student = students[0];
  const classroomIds = students.map(s => s.classroom_id).filter(Boolean);
  const combinedClassroomId = classroomIds.join(',');

  const token = jwt.sign({ id: student.id, role: student.role, classroomId: combinedClassroomId }, JWT_SECRET);
  console.log("Token:", token);
  
  // 2. Simulate verifyToken
  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.log("JWT Verify Error:", err);
      return;
    }
    
    console.log("Decoded:", decoded);
    
    const { data, error } = await supabase.from('students').select('id').eq('id', decoded.id).limit(1);
    console.log("Verify DB Data:", data);
    console.log("Verify DB Error:", error);
  });
}

run();
