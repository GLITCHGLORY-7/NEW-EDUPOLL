const { supabase } = require('../database/db');
const { mapPoll, mapStudent, mapResponse } = require('../utils/mappers');

exports.getActivePolls = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Student only' });
  
  // Fetch ALL rows for this student (could be in multiple classrooms)
  const { data: students } = await supabase.from('students').select('*').eq('id', req.user.id);
  if (!students || students.length === 0) return res.status(404).json({ error: 'Student not found' });

  // Collect all classroom IDs this student belongs to
  const classroomIds = students.map(s => s.classroom_id).filter(Boolean);
  
  if (classroomIds.length === 0) {
    return res.json([]);
  }

  const { data: polls } = await supabase
    .from('polls')
    .select('*')
    .in('classroom_id', classroomIds)
    .eq('status', 'live');

  const activePolls = (polls || [])
    .map(mapPoll)
    .filter(p => {
      if (p.expiresAt && new Date(p.expiresAt) < new Date()) {
        return false;
      }
      const excludedIds = p.excludedStudentIds || [];
      return !excludedIds.includes(req.user.id);
    });
  
  res.json(activePolls);
};

exports.getAllPolls = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Student only' });
    
    // Fetch ALL rows for this student (could be in multiple classrooms)
    const { data: students } = await supabase.from('students').select('*').eq('id', req.user.id);
    if (!students || students.length === 0) return res.status(404).json({ error: 'Student not found' });

    const classroomIds = students.map(s => s.classroom_id).filter(Boolean);

    if (classroomIds.length === 0) {
      return res.json([]);
    }

    const { data: polls, error } = await supabase
      .from('polls')
      .select('*')
      .in('classroom_id', classroomIds);

    if (error) throw error;

    const mapped = (polls || []).map(mapPoll).map(p => {
      if (p.status === 'live' && p.expiresAt && new Date(p.expiresAt) < new Date()) {
        return { ...p, status: 'closed' };
      }
      return p;
    });

    const filtered = mapped.filter(p => {
      const excludedIds = p.excludedStudentIds || [];
      return !excludedIds.includes(req.user.id);
    });

    res.json(filtered);
  } catch (error) {
    console.error('Error in /api/student/polls/all:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getPollById = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Student only' });
  
  // Use .limit(1) instead of .single() to handle multi-classroom students
  const { data: students } = await supabase.from('students').select('*').eq('id', req.user.id);
  const student = students && students.length > 0 ? students[0] : null;
  if (!student) return res.status(404).json({ error: 'Student not found' });
  
  const classroomIds = (students || []).map(s => s.classroom_id).filter(Boolean);

  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('id', req.params.id)
    .eq('status', 'live')
    .single();

  if (!poll) return res.status(404).json({ error: 'Poll not found or not active' });
  
  const mappedPoll = mapPoll(poll);
  if (mappedPoll.expiresAt && new Date(mappedPoll.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Access denied. Poll has expired.' });
  }

  const excludedIds = mappedPoll.excludedStudentIds || [];
  if (excludedIds.includes(student.id)) {
    return res.status(403).json({ error: 'Access denied. Student excluded from this poll.' });
  }

  // Allow if student is in the poll's classroom OR has no classroom assigned yet
  if (classroomIds.length > 0 && !classroomIds.includes(mappedPoll.classroomId)) {
    return res.status(403).json({ error: 'Access denied. Student not in classroom.' });
  }
  
  res.json(mappedPoll);
};

exports.getStudentProfile = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Student only' });
  const { data: students } = await supabase.from('students').select('*').eq('id', req.user.id);
  const student = students && students.length > 0 ? students[0] : null;
  if (!student) return res.status(404).json({ error: 'Student not found' });
  
  // Collect all classrooms this student is in
  let classrooms = [];
  if (students && students.length > 0) {
    const classroomIds = students.map(s => s.classroom_id).filter(Boolean);
    if (classroomIds.length > 0) {
      const { data: classData } = await supabase.from('classrooms').select('id, name, staff_id').in('id', classroomIds);
      if (classData) {
        const staffIds = classData.map(c => c.staff_id).filter(Boolean);
        let staffMap = {};
        if (staffIds.length > 0) {
          const { data: staffData } = await supabase.from('users').select('id, name').in('id', staffIds);
          (staffData || []).forEach(st => staffMap[st.id] = st.name);
        }
        
        classrooms = classData.map(c => ({
          id: c.id,
          name: c.name,
          staffId: c.staff_id,
          staffName: staffMap[c.staff_id] || 'Staff Member'
        }));
      }
    }
  }
  
  let classroomName = classrooms.length > 0 ? classrooms.map(c => c.name).join(', ') : '';
  
  res.json({ ...mapStudent(student), classroomName, classrooms });
};

exports.getStudentResponses = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Student only' });
  
  let query = supabase.from('responses').select('*').eq('student_id', req.user.id);
  if (req.query.history === 'true') {
    query = query.eq('hidden_from_history', false);
  }
  
  const { data: responses } = await query;
  res.json((responses || []).map(mapResponse));
};

async function forwardQueryToMessages(req, pollId, query) {
  if (!query) return;
  try {
    const { supabase } = require('../database/db');
    const { data: poll } = await supabase.from('polls').select('classroom_id, question').eq('id', pollId).single();
    if (poll && poll.classroom_id) {
      const { data: classroom } = await supabase.from('classrooms').select('staff_id').eq('id', poll.classroom_id).single();
      if (classroom && classroom.staff_id) {
        const { data: studentProfile } = await supabase.from('students').select('name').eq('id', req.user.id).single();
        const { data: staffProfile } = await supabase.from('users').select('name, role').eq('id', classroom.staff_id).single();
        
        if (studentProfile && staffProfile) {
          const { getOrCreateConversation } = require('./messagesController');
          const conv = await getOrCreateConversation(
            req.user.id, classroom.staff_id, null,
            {
              nameA: studentProfile.name,
              nameB: staffProfile.name,
              roleA: 'student',
              roleB: staffProfile.role
            }
          );

          const msgId = `MSG-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
          await supabase.from('messages').insert([{
            id: msgId,
            conversation_id: conv.id,
            sender_id: req.user.id,
            content: `[Poll Query: ${poll.question}]\n\n${query}`,
            is_read: false
          }]);

          await supabase.from('conversations').update({
            last_message: 'Sent a poll query',
            last_message_at: new Date().toISOString()
          }).eq('id', conv.id);
        }
      }
    }
  } catch (err) {
    console.error('Failed to forward poll query to messages:', err);
  }
}

exports.answerPoll = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Student only' });
  
  const pollId = req.params.id;
  const { answer, query } = req.body;
  
  // Use array query to avoid .single() crash for multi-classroom students
  const { data: existingResponses } = await supabase
    .from('responses')
    .select('*')
    .eq('poll_id', pollId)
    .eq('student_id', req.user.id)
    .limit(1);

  const existingResponse = existingResponses && existingResponses.length > 0 ? existingResponses[0] : null;

  if (existingResponse) {
    let existingChoice = existingResponse.answer;
    let oldReply = '';
    let existingMessages = [];
    if (existingChoice && existingChoice.startsWith('{')) {
      try {
        const parsed = JSON.parse(existingChoice);
        existingChoice = parsed.choice;
        oldReply = parsed.staffReply || '';
        existingMessages = parsed.messages || [];
      } catch(e) {}
    }
    
    if (query) {
      existingMessages.push({ sender: 'student', text: query, time: new Date().toISOString() });
    }
    
    const updatedAnswer = JSON.stringify({
      choice: answer !== undefined ? answer : existingChoice,
      query: query || '',
      staffReply: oldReply,
      messages: existingMessages
    });

    const { data: updatedArr, error } = await supabase
      .from('responses')
      .update({
        answer: updatedAnswer,
        submitted_at: new Date().toISOString()
      })
      .eq('id', existingResponse.id)
      .select();

    if (error) return res.status(500).json({ error: 'Failed to update answer/query' });
    
    // Also forward to messages!
    if (query) {
      await forwardQueryToMessages(req, pollId, query);
    }
    
    return res.json(mapResponse(updatedArr[0]));
  }

  const responseId = `RESP-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  
  let messages = [];
  if (query) {
    messages.push({ sender: 'student', text: query, time: new Date().toISOString() });
  }

  const finalAnswer = JSON.stringify({
    choice: answer,
    query: query || '',
    staffReply: '',
    messages
  });

  if (query) {
    await forwardQueryToMessages(req, pollId, query);
  }

  const { data: newResponses, error } = await supabase
    .from('responses')
    .insert([{
      id: responseId,
      poll_id: pollId,
      student_id: req.user.id,
      answer: finalAnswer
    }])
    .select();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to submit response' });
  }
  res.json(mapResponse(newResponses[0]));
};

exports.deleteResponseByPoll = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Student only' });
  // Decode in case the pollId was URL-encoded (e.g. GENERAL_classroomId)
  const pollId = decodeURIComponent(req.params.pollId);
  
  // For GENERAL queries (any variant), fully delete so student can submit fresh
  if (pollId && pollId.startsWith('GENERAL')) {
    const { error } = await supabase
      .from('responses')
      .delete()
      .or(`poll_id.eq.${pollId},poll_id.eq.GENERAL`)
      .eq('student_id', req.user.id);
      
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to delete query' });
    }
    return res.json({ success: true });
  }
  
  // For regular polls, just hide from history
  const { error } = await supabase
    .from('responses')
    .update({ hidden_from_history: true })
    .eq('poll_id', pollId)
    .eq('student_id', req.user.id);
    
  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to clear response' });
  }
  res.json({ success: true });
};

exports.deleteResponseById = async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Student only' });
  const { responseId } = req.params;
  
  const { error } = await supabase
    .from('responses')
    .update({ hidden_from_history: true })
    .eq('id', responseId)
    .eq('student_id', req.user.id);
    
  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to clear response' });
  }
  res.json({ success: true });
};
