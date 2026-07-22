const { supabase } = require('../database/db');
const bcrypt = require('bcryptjs');

exports.getStaff = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  const { data: staffList, error } = await supabase
    .from('users')
    .select('id, name, email, login_id, role, gender, position, last_seen')
    .eq('role', 'staff')
    .neq('id', 'SAIRAM');
  if (error) return res.status(500).json({ error: 'Failed to load staff' });

  let assignments = [];
  try {
    const { data: assData } = await supabase.from('classroom_staff').select('classroom_id, staff_id');
    if (assData) assignments = assData;
  } catch (e) {
    console.log('classroom_staff query failed (may not be created yet):', e);
  }

  const mapped = (staffList || []).map(s => {
    const sAss = (assignments || []).filter(a => a.staff_id === s.id).map(a => a.classroom_id);
    return {
      ...s,
      classroomIds: sAss
    };
  });

  res.json(mapped);
};

exports.getNotifications = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  const { data: classrooms } = await supabase.from('classrooms').select('id').eq('staff_id', req.user.id);
  if (!classrooms || classrooms.length === 0) return res.json({ count: 0 });
  const classIds = classrooms.map(c => c.id);
  
  const { data: students } = await supabase.from('students').select('id, classroom_id').in('classroom_id', classIds);
  if (!students || students.length === 0) return res.json({ count: 0 });
  const studentIds = students.map(s => s.id);
  
  const { data: responses } = await supabase.from('responses').select('*').in('student_id', studentIds);
  
  let unreadCount = 0;
  let latestClassroomId = null;
  let latestTime = 0;
  const notificationsList = [];
  
  for (const r of (responses || [])) {
    if (r.answer && r.answer.startsWith('{')) {
      try {
        const parsed = JSON.parse(r.answer);
        let hasUnread = false;
        let lastMessageText = 'New query from student';
        let msgLength = 0;
        if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          msgLength = parsed.messages.length;
          const lastMessage = parsed.messages[parsed.messages.length - 1];
          if (lastMessage.sender === 'student') {
            hasUnread = true;
            lastMessageText = lastMessage.text;
          }
        } else if (parsed.query && parsed.query.trim().length > 0 && !parsed.staffReply) {
          hasUnread = true;
          lastMessageText = parsed.query;
          msgLength = 1; // Treat legacy query as 1 message
        }

        if (hasUnread) {
          unreadCount++;
          const time = new Date(r.submitted_at).getTime();
          const student = students.find(s => s.id === r.student_id);
          const cId = student ? student.classroom_id : null;

          if (time > latestTime) {
            latestTime = time;
            latestClassroomId = cId;
          }

          notificationsList.push({
            id: r.id,
            msgLength,
            pollId: r.poll_id,
            studentId: r.student_id,
            classroomId: cId,
            text: lastMessageText,
            time: r.submitted_at
          });
        }
      } catch (e) {}
    }
  }
  
  // Sort notifications from newest to oldest
  notificationsList.sort((a, b) => new Date(b.time) - new Date(a.time));

  res.json({ count: unreadCount, classroomId: latestClassroomId, notifications: notificationsList });
};

exports.deleteStaff = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  if (req.user.id !== 'SAIRAM') return res.status(403).json({ error: 'Only the Admin can delete staff' });
  
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: 'Failed to delete staff' });
  res.json({ success: true });
};

exports.updateStaff = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  if (req.user.id !== 'SAIRAM' && req.user.id !== req.params.id) return res.status(403).json({ error: 'Not authorized to update this staff member' });

  const { name, email, loginId, password, gender, position, classroomIds } = req.body;
  const updateData = {
    name,
    email,
    login_id: loginId,
    gender: gender || 'Male',
    position: position || null
  };

  if (password && password.trim() !== '') {
    updateData.password = await bcrypt.hash(password, 10);
  }

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update staff' });
  }

  // Update classroom assignments if provided and user is Admin SAIRAM
  if (req.user.id === 'SAIRAM' && classroomIds !== undefined) {
    try {
      await supabase.from('classroom_staff').delete().eq('staff_id', req.params.id);
      if (Array.isArray(classroomIds) && classroomIds.length > 0) {
        const rows = classroomIds.map(cId => ({
          classroom_id: cId,
          staff_id: req.params.id
        }));
        await supabase.from('classroom_staff').insert(rows);
      }
    } catch (e) {
      console.error('Failed to update classroom assignments:', e);
    }
  }

  res.json({ id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, login_id: updatedUser.login_id, role: updatedUser.role, gender: updatedUser.gender });
};
