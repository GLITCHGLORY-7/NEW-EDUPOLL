const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../database/db');
const { JWT_SECRET } = require('../middleware/auth');

exports.register = async (req, res) => {
  if (req.user?.id !== 'SAIRAM') return res.status(403).json({ error: 'Only the Admin can create staff' });
  const { name, email, loginId, password, gender, position, classroomIds } = req.body;
  if (!name || !loginId || !password) return res.status(400).json({ error: 'Missing required fields' });
  
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('login_id', loginId)
    .single();

  if (existingUser) {
    return res.status(400).json({ error: 'Login ID already exists' });
  }

  const staffId = `STAFF-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const { data: newUser, error } = await supabase
    .from('users')
    .insert([{
      id: staffId,
      name,
      email,
      login_id: loginId,
      password: hashedPassword,
      role: 'staff',
      gender: gender || 'Male',
      position: position || null
    }])
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to register staff' });
  }

  if (Array.isArray(classroomIds) && classroomIds.length > 0) {
    try {
      const rows = classroomIds.map(cId => ({
        classroom_id: cId,
        staff_id: newUser.id
      }));
      await supabase.from('classroom_staff').insert(rows);
    } catch (e) {
      console.error('Failed to create classroom staff links on register:', e);
    }
  }
  
  const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET);
  return res.json({ token, user: { id: newUser.id, name: newUser.name, role: newUser.role, email: newUser.email, gender: newUser.gender, position: newUser.position } });
};

exports.login = async (req, res) => {
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res.status(400).json({ error: 'Login ID and password are required.' });
  }

  // 1. Check users table (Admin & Staff)
  const { data: staffRows, error: staffError } = await supabase
    .from('users')
    .select('*')
    .or(`login_id.ilike.${loginId},id.ilike.${loginId}`)
    .limit(1);
  const staff = staffRows && staffRows.length > 0 ? staffRows[0] : null;

  if (staffError) {
    console.error('Database query error during login.');
  }

  if (staff) {
    if (staff.password) {
      const validPassword = await bcrypt.compare(password, staff.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    const token = jwt.sign({ id: staff.id, role: staff.role }, JWT_SECRET);
    return res.json({ token, user: { id: staff.id, name: staff.name, role: staff.role, email: staff.email, gender: staff.gender, loginId: staff.login_id, position: staff.position, department: staff.department } });
  }

  // 2. Check students table
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('*')
    .ilike('id', loginId);

  if (studentError) {
    console.error('Database query error during student login.');
  }

  if (students && students.length > 0) {
    const student = students[0];

    if (student.password) {
      const validPassword = await bcrypt.compare(password, student.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    const classroomIds = students.map(s => s.classroom_id).filter(Boolean);
    const combinedClassroomId = classroomIds.join(',');

    const token = jwt.sign({ id: student.id, role: student.role, classroomId: combinedClassroomId }, JWT_SECRET);
    return res.json({ token, user: {
      id: student.id,
      name: student.name,
      role: student.role,
      department: student.department,
      year: student.year,
      section: student.section,
      classroomId: combinedClassroomId,
      gender: student.gender
    }});
  }

  return res.status(401).json({ error: 'Invalid credentials. User not found.' });
};

