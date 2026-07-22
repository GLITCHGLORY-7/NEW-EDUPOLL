const { supabase } = require('../database/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'poolsync-super-secret-key';

async function run() {
  const loginId = "ADMIN001";
  
  const { data: students } = await supabase.from('students').select('*').ilike('id', loginId);
  if (!students || students.length === 0) return;
  const student = students[0];
  const classroomIds = students.map(s => s.classroom_id).filter(Boolean);
  const token = jwt.sign({ id: student.id, role: student.role, classroomId: classroomIds.join(',') }, JWT_SECRET);
  
  const endpoints = [
    '/api/student/me',
    '/api/student/polls',
    '/api/student/polls/all',
    '/api/student/responses',
    '/api/messages/conversations',
    '/api/announcements'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:3000${ep}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`[${res.status}] ${ep}`);
    } catch(e) {
      console.log(`[Error] ${ep}:`, e.message);
    }
  }
}

run();
