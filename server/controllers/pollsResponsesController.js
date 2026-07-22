const { supabase } = require('../database/db');
const { mapResponse } = require('../utils/mappers');

exports.replyToResponse = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  const { pollId, studentId } = req.params;
  const { reply } = req.body;
  
  let dbQuery = supabase
    .from('responses')
    .select('*')
    .eq('student_id', studentId);
    
  if (pollId && pollId.startsWith('GENERAL')) {
    dbQuery = dbQuery.or(`poll_id.eq.${pollId},poll_id.eq.GENERAL`);
  } else {
    dbQuery = dbQuery.eq('poll_id', pollId);
  }
  
  const { data: resp, error: fetchErr } = await dbQuery.limit(1).maybeSingle();
    
  if (fetchErr || !resp) return res.status(404).json({ error: 'Response not found' });
  
  let choice = resp.answer;
  let queryText = '';
  let oldReply = '';
  let existingMessages = [];
  if (resp.answer && resp.answer.startsWith('{')) {
    try {
      const parsed = JSON.parse(resp.answer);
      choice = parsed.choice;
      queryText = parsed.query || '';
      oldReply = parsed.staffReply || '';
      existingMessages = parsed.messages || [];
    } catch(e) {}
  } else {
    choice = resp.answer;
    queryText = '';
  }
  
  if (existingMessages.length === 0 && (queryText || oldReply)) {
    if (queryText) existingMessages.push({ sender: 'student', text: queryText, time: resp.submitted_at });
    if (oldReply) existingMessages.push({ sender: 'staff', text: oldReply, time: resp.submitted_at });
  }

  existingMessages.push({ sender: 'staff', text: reply, time: new Date().toISOString() });
  
  const updatedAnswer = JSON.stringify({
    choice,
    query: queryText || (existingMessages.find(m => m.sender === 'student')?.text || ''),
    staffReply: reply || '',
    messages: existingMessages
  });
  
  const { data: updated, error: updateErr } = await supabase
    .from('responses')
    .update({ answer: updatedAnswer })
    .eq('id', resp.id)
    .select()
    .single();
    
  if (updateErr) return res.status(500).json({ error: 'Failed to submit reply' });
  
  res.json({ success: true, response: mapResponse(updated) });
};

exports.sendGeneralMessage = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  const { studentId } = req.params;
  const { message } = req.body;
  
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }
  
  const { data: existing } = await supabase
    .from('responses')
    .select('*')
    .eq('poll_id', 'GENERAL')
    .eq('student_id', studentId)
    .single();
    
  if (existing) {
    let choice = 'General Query';
    let queryText = '';
    let oldReply = '';
    let existingMessages = [];
    if (existing.answer && existing.answer.startsWith('{')) {
      try {
        const parsed = JSON.parse(existing.answer);
        choice = parsed.choice || 'General Query';
        queryText = parsed.query || '';
        oldReply = parsed.staffReply || '';
        existingMessages = parsed.messages || [];
      } catch(e) {}
    }
    
    if (existingMessages.length === 0 && (queryText || oldReply)) {
      if (queryText) existingMessages.push({ sender: 'student', text: queryText, time: existing.submitted_at });
      if (oldReply) existingMessages.push({ sender: 'staff', text: oldReply, time: existing.submitted_at });
    }
    
    existingMessages.push({ sender: 'staff', text: message, time: new Date().toISOString() });
    
    const updatedAnswer = JSON.stringify({
      choice,
      query: queryText,
      staffReply: message,
      messages: existingMessages
    });
    
    const { data: updated, error } = await supabase
      .from('responses')
      .update({
        answer: updatedAnswer,
        submitted_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();
      
    if (error) return res.status(500).json({ error: 'Failed to update message' });
    return res.json({ success: true, response: mapResponse(updated) });
  }
  
  const responseId = `RESP-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  const messages = [{ sender: 'staff', text: message, time: new Date().toISOString() }];
  
  const finalAnswerText = JSON.stringify({
    choice: 'General Query',
    query: '',
    staffReply: message,
    messages
  });
  
  const { data: newResponse, error } = await supabase
    .from('responses')
    .insert([{
      id: responseId,
      poll_id: 'GENERAL',
      student_id: studentId,
      answer: finalAnswerText
    }])
    .select()
    .single();
    
  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
  res.json({ success: true, response: mapResponse(newResponse) });
};

exports.deleteResponse = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });
  
  const { error } = await supabase
    .from('responses')
    .delete()
    .eq('poll_id', req.params.pollId)
    .eq('student_id', req.params.studentId);

  if (error) return res.status(500).json({ error: 'Failed to delete response' });
  res.json({ success: true });
};
