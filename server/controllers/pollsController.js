const { supabase } = require('../database/db');
const { mapPoll, mapResponse, parseResponseAnswer } = require('../utils/mappers');

exports.getPolls = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  if (req.user.id === 'SAIRAM') {
    const { data: polls, error } = await supabase.from('polls').select('*').neq('status', 'archived');
    if (error) return res.status(500).json({ error: 'Failed to load polls' });
    return res.json((polls || []).map(mapPoll));
  }

  const { data: assignments } = await supabase
    .from('classroom_staff')
    .select('classroom_id')
    .eq('staff_id', req.user.id);
  const classroomIds = (assignments || []).map(a => a.classroom_id);

  if (classroomIds.length === 0) {
    return res.json([]);
  }

  const { data: polls, error } = await supabase
    .from('polls')
    .select('*')
    .in('classroom_id', classroomIds)
    .neq('status', 'archived');

  if (error) return res.status(500).json({ error: 'Failed to load polls' });
  res.json((polls || []).map(mapPoll));
};

exports.createPoll = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  const pollId = `POLL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

  const { data: newPoll, error } = await supabase
    .from('polls')
    .insert([{
      id: pollId,
      staff_id: req.user.id,
      classroom_id: req.body.classroomId,
      question: req.body.question,
      options: req.body.options || [],
      status: req.body.status || 'live',
      item_type: req.body.itemType || 'poll',
      excluded_student_ids: req.body.excludedStudentIds || []
    }])
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create poll' });
  }
  res.json(mapPoll(newPoll));
};

exports.updatePoll = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  const { data: poll } = await supabase
    .from('polls')
    .select('staff_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  if (poll.staff_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own polls.' });
  }

  const { data: updatedPoll, error } = await supabase
    .from('polls')
    .update({
      classroom_id: req.body.classroomId,
      question: req.body.question,
      options: req.body.options,
      status: req.body.status,
      item_type: req.body.itemType,
      excluded_student_ids: req.body.excludedStudentIds,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update poll' });
  }
  res.json(mapPoll(updatedPoll));
};

exports.deletePoll = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  const pollId = req.params.id;

  // Verify authorization: only owner can delete
  const { data: poll } = await supabase
    .from('polls')
    .select('staff_id, status')
    .eq('id', pollId)
    .maybeSingle();

  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  if (poll.staff_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own polls.' });
  }

  // If not archived yet, move it to archived instead of deleting it
  if (poll.status !== 'archived') {
    const { error: archiveError } = await supabase
      .from('polls')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', pollId);

    if (archiveError) return res.status(500).json({ error: 'Failed to archive poll' });
    return res.json({ success: true, archived: true, message: 'Poll moved to archive.' });
  }

  // If already archived, perform permanent delete
  // Delete responses first
  await supabase
    .from('responses')
    .delete()
    .eq('poll_id', pollId);

  // Delete saved reports related to this poll if any
  await supabase
    .from('saved_reports')
    .delete()
    .eq('poll_id', pollId);

  const { error } = await supabase
    .from('polls')
    .delete()
    .eq('id', pollId);

  if (error) return res.status(500).json({ error: 'Failed to delete poll' });
  res.json({ success: true, deleted: true, message: 'Poll permanently deleted.' });
};

exports.getResponsesSummary = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  let query = supabase.from('polls').select('*').neq('status', 'archived');
  let classQuery = supabase.from('classrooms').select('*');

  if (req.user.id !== 'SAIRAM') {
    const { data: assignments } = await supabase
      .from('classroom_staff')
      .select('classroom_id')
      .eq('staff_id', req.user.id);
    const classroomIds = (assignments || []).map(a => a.classroom_id);

    if (classroomIds.length === 0) return res.json([]);
    query = query.in('classroom_id', classroomIds);
    classQuery = classQuery.in('id', classroomIds);
  }

  const { data: polls } = await query;
  const { data: classrooms } = await classQuery;
  const { data: students } = await supabase.from('students').select('*');
  const { data: responses } = await supabase.from('responses').select('*');

  const summary = (polls || []).map(p => {
    const classroom = (classrooms || []).find(c => c.id === p.classroom_id);
    const classroomStudents = (students || []).filter(s => s.classroom_id === p.classroom_id);
    
    const excludedIds = typeof p.excluded_student_ids === 'string' ? JSON.parse(p.excluded_student_ids) : (p.excluded_student_ids || []);
    const eligibleStudents = classroomStudents.filter(s => !excludedIds.includes(s.id));
    const pollResponses = (responses || []).filter(r => r.poll_id === p.id);
    
    return {
      id: p.id,
      question: p.question,
      classroomName: classroom ? classroom.name : 'Unknown',
      status: p.status,
      responsesCount: pollResponses.length,
      totalStudents: eligibleStudents.length,
      notAnswered: Math.max(0, eligibleStudents.length - pollResponses.length),
      createdAt: p.created_at
    };
  });
  
  res.json(summary);
};

exports.getPollResults = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  const pollId = req.params.id;
  let poll;
  
  if (pollId.startsWith('GENERAL')) {
    poll = {
      id: pollId,
      classroom_id: req.query.classroomId || pollId.replace('GENERAL_', '') || '',
      question: 'General Classroom Queries',
      options: [],
      status: 'live',
      item_type: 'general_query'
    };
  } else {
    const { data: p } = await supabase.from('polls').select('*').eq('id', pollId).single();
    poll = p;
  }
  
  if (!poll) return res.status(404).json({ error: 'Poll not found' });

  // Fetch the staff creator name from users table
  let staffName = 'Staff Member';
  if (poll.staff_id) {
    const { data: creator } = await supabase
      .from('users')
      .select('name')
      .eq('id', poll.staff_id)
      .maybeSingle();
    if (creator) staffName = creator.name;
  }

  const { data: students } = await supabase.from('students').select('*').eq('classroom_id', poll.classroom_id);
  const classroomStudents = students || [];

  if (pollId.startsWith('GENERAL')) {
    const studentIds = classroomStudents.map(s => s.id);
    let allResponses = [];
    if (studentIds.length > 0) {
      // Use the exact pollId (e.g. GENERAL_class123) or GENERAL for backward compatibility
      const { data } = await supabase.from('responses').select('*').in('student_id', studentIds).or(`poll_id.eq.${pollId},poll_id.eq.GENERAL`);
      allResponses = data || [];
    }
    
    const answered = [];
    for (const r of allResponses) {
      const parsed = parseResponseAnswer(r.answer, r.submitted_at);
      
      if (parsed.queryText && parsed.queryText.trim().length > 0) {
        const student = classroomStudents.find(s => s.id === r.student_id);
        if (student) {
          answered.push({
            id: student.id,
            name: student.name,
            status: parsed.answerText,
            choice: parsed.rawChoice,
            query: parsed.queryText,
            staffReply: parsed.replyText,
            messages: parsed.messages,
            time: r.submitted_at,
            pollId: r.poll_id
          });
        }
      }
    }
    
    answered.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    return res.json({
      poll: { ...mapPoll(poll), staffName },
      answered,
      notAnswered: [],
      totalResponses: answered.length,
      totalStudents: classroomStudents.length
    });
  }

  const { data: responses } = await supabase.from('responses').select('*').eq('poll_id', pollId);
  const pollResponses = responses || [];
  
  const answeredIds = pollResponses.map(r => r.student_id);
  
  const answered = classroomStudents
    .filter(s => answeredIds.includes(s.id))
    .map(s => {
      const resp = pollResponses.find(r => r.student_id === s.id);
      const parsed = parseResponseAnswer(resp.answer, resp.submitted_at);
      return { 
        id: s.id, 
        name: s.name, 
        status: parsed.answerText, 
        choice: parsed.rawChoice,
        query: parsed.queryText,
        staffReply: parsed.replyText,
        messages: parsed.messages,
        time: resp.submitted_at,
        pollId: pollId
      };
    });
    
  answered.sort((a, b) => new Date(b.time) - new Date(a.time));
    
  const notAnswered = classroomStudents
    .filter(s => !answeredIds.includes(s.id))
    .map(s => ({ id: s.id, name: s.name, status: 'Not Answered' }));
    
  res.json({ 
    poll: { ...mapPoll(poll), staffName }, 
    answered, 
    notAnswered, 
    totalResponses: pollResponses.length, 
    totalStudents: classroomStudents.length 
  });
};

exports.clearAllResponses = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  const pollId = req.params.id;
  
  const { error } = await supabase
    .from('responses')
    .delete()
    .eq('poll_id', pollId);
    
  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to clear poll responses' });
  }
  res.json({ success: true });
};

// GET /api/polls/archived
exports.getArchivedPolls = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });

  try {
    let query = supabase.from('polls').select('*').eq('status', 'archived');

    if (req.user.id !== 'SAIRAM') {
      // Staff only sees their own archived polls
      query = query.eq('staff_id', req.user.id);
    }

    const { data: polls, error } = await query;
    if (error) throw error;

    // Fetch classroom details
    const { data: classrooms } = await supabase.from('classrooms').select('id, name');
    
    // Fetch staff user details if Admin
    let users = [];
    if (req.user.id === 'SAIRAM') {
      const { data: u } = await supabase.from('users').select('id, name');
      users = u || [];
    }

    const mapped = (polls || []).map(p => {
      const cls = (classrooms || []).find(c => c.id === p.classroom_id);
      const creator = (users || []).find(u => u.id === p.staff_id);
      return {
        id: p.id,
        staffId: p.staff_id,
        staffName: creator ? creator.name : (p.staff_id === req.user.id ? req.user.name : 'Staff'),
        classroomId: p.classroom_id,
        classroomName: cls ? cls.name : (p.classroom_id || 'Global'),
        question: p.question,
        options: p.options,
        status: p.status,
        itemType: p.item_type,
        createdAt: p.created_at,
        archivedAt: p.updated_at || p.created_at
      };
    });

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load archived polls' });
  }
};

// POST /api/polls/:id/restore
exports.restorePoll = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });

  try {
    const pollId = req.params.id;
    // Check authorization: Admin only
    if (req.user.id !== 'SAIRAM') {
      return res.status(403).json({ error: 'Only admins can restore archived polls' });
    }

    const { data, error } = await supabase
      .from('polls')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', pollId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, poll: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to restore poll' });
  }
};

// POST /api/polls/cleanup
exports.runManualCleanup = async (req, res) => {
  if (req.user.role !== 'staff' || req.user.id !== 'SAIRAM') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const { performCleanup } = require('../services/cleanupService');
    const result = await performCleanup();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Manual cleanup failed' });
  }
};
