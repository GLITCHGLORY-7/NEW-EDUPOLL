const { supabase } = require('../database/db');
const bcrypt = require('bcryptjs');
const { mapStudent } = require('../utils/mappers');

exports.getStudents = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  if (req.user.id === 'SAIRAM') {
    const { data: students, error } = await supabase.from('students').select('*');
    if (error) return res.status(500).json({ error: 'Failed to load students' });
    return res.json((students || []).map(mapStudent));
  }

  const { data: assignments } = await supabase
    .from('classroom_staff')
    .select('classroom_id')
    .eq('staff_id', req.user.id);
  const classroomIds = (assignments || []).map(a => a.classroom_id);

  let query = supabase.from('students').select('*');
  if (classroomIds.length > 0) {
    query = query.or(`classroom_id.is.null,classroom_id.in.(${classroomIds.join(',')})`);
  } else {
    query = query.is('classroom_id', null);
  }

  const { data: students, error } = await query;
  if (error) return res.status(500).json({ error: 'Failed to load students' });
  res.json((students || []).map(mapStudent));
};

exports.createStudent = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  let studentId = req.body.id;
  if (!studentId) {
    studentId = `SEC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  }

  // Check if student already exists
  const { data: existingStudents } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId);

  let finalHashedPassword = '';

  if (existingStudents && existingStudents.length > 0) {
    const existingStudent = existingStudents[0];
    if (req.body.password) {
      const validPassword = await bcrypt.compare(req.body.password, existingStudent.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Student ID already registered with a different password.' });
      }
    } else {
      return res.status(400).json({ error: 'Password required to register existing student ID.' });
    }
    
    // Normalize classroomId: treat empty string same as no classroom
    const requestedClassroomId = req.body.classroomId || null;
    
    // Check if student is already in EXACTLY this classroom
    const alreadyInClassroom = existingStudents.some(s => {
      const existingRoom = s.classroom_id || null;
      return existingRoom === requestedClassroomId;
    });
    
    if (alreadyInClassroom) {
      return res.status(400).json({ error: 'This student is already registered in this classroom.' });
    }
    finalHashedPassword = existingStudent.password; // Use existing hash
  } else {
    finalHashedPassword = req.body.password ? await bcrypt.hash(req.body.password, 10) : '';
  }

  const { data: newStudent, error } = await supabase
    .from('students')
    .insert([{
      id: studentId,
      name: req.body.name,
      password: finalHashedPassword,
      department: req.body.department || '',
      year: req.body.year || '',
      section: req.body.section || '',
      classroom_id: req.body.classroomId || null,
      role: 'student',
      gender: req.body.gender || 'Male',
      degree: req.body.degree || ''
    }])
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to register student' });
  }
  res.json(mapStudent(newStudent));
};

exports.updateStudent = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  const commonUpdates = {
    name: req.body.name,
    department: req.body.department,
    year: req.body.year,
    section: req.body.section,
    gender: req.body.gender,
    degree: req.body.degree
  };

  if (req.body.password) {
    commonUpdates.password = await bcrypt.hash(req.body.password, 10);
  }

  // 1. Update personal details across ALL rows for this student
  let { error: commonError } = await supabase
    .from('students')
    .update(commonUpdates)
    .eq('id', req.params.id);

  if (commonError) {
    console.error(commonError);
    return res.status(500).json({ error: 'Failed to update student profile' });
  }
  
  // 2. Update classroom_id for the specific enrollment
  if (req.body.classroomId !== undefined) {
    const targetClassroomId = req.body.classroomId || null;
    const oldClassroomId = req.body.oldClassroomId || null;
    
    let query = supabase.from('students')
      .update({ classroom_id: targetClassroomId })
      .eq('id', req.params.id);
      
    if (oldClassroomId) {
      query = query.eq('classroom_id', oldClassroomId);
    } else {
      query = query.is('classroom_id', null);
    }
    
    const { error: classError } = await query;
    if (classError) {
      console.error(classError);
      return res.status(500).json({ error: 'Failed to update student classroom' });
    }
  }

  // Fetch any one row to return to the client
  const { data: updatedStudents } = await supabase
    .from('students')
    .select('*')
    .eq('id', req.params.id)
    .limit(1);

  if (updatedStudents && updatedStudents.length > 0) {
    res.json(mapStudent(updatedStudents[0]));
  } else {
    res.json({ success: true });
  }
};

exports.deleteStudent = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  const classroomId = req.query.classroomId || null;
  
  let query = supabase.from('students')
    .delete()
    .eq('id', req.params.id);
    
  if (classroomId) {
    query = query.eq('classroom_id', classroomId);
  } else {
    query = query.is('classroom_id', null);
  }

  const { error } = await query;

  if (error) return res.status(500).json({ error: 'Failed to delete student' });
  res.json({ success: true });
};
