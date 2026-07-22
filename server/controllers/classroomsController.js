const { supabase } = require('../database/db');
const { mapClassroom } = require('../utils/mappers');

exports.getClassrooms = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  if (req.user.id === 'SAIRAM') {
    const { data: classrooms, error } = await supabase.from('classrooms').select('*');
    if (error) return res.status(500).json({ error: 'Failed to load classrooms' });
    return res.json((classrooms || []).map(mapClassroom));
  }

  // 1. Get classrooms assigned to this staff member via classroom_staff
  const { data: assignments } = await supabase
    .from('classroom_staff')
    .select('classroom_id')
    .eq('staff_id', req.user.id);
  const assignedIds = (assignments || []).map(a => a.classroom_id);

  // 2. Fetch classrooms matching those IDs or legacy staff_id
  let query = supabase.from('classrooms').select('*');
  if (assignedIds.length > 0) {
    query = query.or(`id.in.(${assignedIds.join(',')}),staff_id.eq.${req.user.id}`);
  } else {
    query = query.eq('staff_id', req.user.id);
  }

  const { data: classrooms, error } = await query;
  if (error) return res.status(500).json({ error: 'Failed to load classrooms' });
  res.json((classrooms || []).map(mapClassroom));
};

exports.createClassroom = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  if (req.user.id !== 'SAIRAM') return res.status(403).json({ error: 'Only Admin can create classrooms' });
  
  const classroomId = `CLASS-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  const code = `E${Math.floor(1000 + Math.random() * 9000)}`;

  const { data: rows, error } = await supabase
    .from('classrooms')
    .insert([{
      id: classroomId,
      staff_id: req.body.staffId || null,
      name: req.body.name,
      year: req.body.year || '',
      section: req.body.section || '',
      department: req.body.department || '',
      description: req.body.description || '',
      code,
      active_poll_id: null,
      staff_name: req.body.staffName || ''
    }])
    .select();

  if (error) {
    console.error('Create classroom error:', error);
    return res.status(500).json({ error: 'Failed to create classroom' });
  }
  const newClassroom = rows && rows.length > 0 ? rows[0] : null;
  if (!newClassroom) return res.status(500).json({ error: 'Classroom created but could not retrieve it' });
  res.json(mapClassroom(newClassroom));
};

exports.updateClassroom = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  if (req.user.id !== 'SAIRAM') return res.status(403).json({ error: 'Only Admin can update classrooms' });
  
  const { data: updatedRows, error } = await supabase
    .from('classrooms')
    .update({
      name: req.body.name,
      year: req.body.year,
      section: req.body.section,
      department: req.body.department,
      description: req.body.description,
      active_poll_id: req.body.activePollId,
      staff_id: req.body.staffId,
      staff_name: req.body.staffName
    })
    .eq('id', req.params.id)
    .select();

  if (error) {
    console.error('Update classroom error:', error);
    return res.status(500).json({ error: 'Failed to update classroom' });
  }
  const updatedClassroom = updatedRows && updatedRows.length > 0 ? updatedRows[0] : null;
  if (!updatedClassroom) return res.status(500).json({ error: 'Update failed — classroom not found' });
  res.json(mapClassroom(updatedClassroom));
};

exports.deleteClassroom = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  if (req.user.id !== 'SAIRAM') return res.status(403).json({ error: 'Only Admin can delete classrooms' });
  
  const { error } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: 'Failed to delete classroom' });
  res.json({ success: true });
};
