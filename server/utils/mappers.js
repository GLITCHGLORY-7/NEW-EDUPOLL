function mapClassroom(c) {
  if (!c) return null;
  return {
    id: c.id,
    staffId: c.staff_id,
    name: c.name,
    year: c.year,
    section: c.section,
    department: c.department,
    description: c.description,
    code: c.code,
    activePollId: c.active_poll_id,
    staffName: c.staff_name
  };
}

function mapUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    loginId: u.login_id,
    role: u.role,
    gender: u.gender,
    position: u.position
  };
}

function mapStudent(s) {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    role: s.role,
    department: s.department,
    year: s.year,
    section: s.section,
    classroomId: s.classroom_id,
    gender: s.gender || 'Male',
    degree: s.degree
  };
}

function mapPoll(p) {
  if (!p) return null;
  let options = p.options;
  let expiresAt = null;
  let allowMultiple = false;
  
  if (options && typeof options === 'object' && !Array.isArray(options)) {
    expiresAt = options.expiresAt;
    allowMultiple = !!options.allowMultiple;
    options = options.choices;
  }
  
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        expiresAt = parsed.expiresAt;
        allowMultiple = !!parsed.allowMultiple;
        options = parsed.choices;
      } else {
        options = parsed;
      }
    } catch (e) {
      options = [];
    }
  }
  if (!Array.isArray(options)) {
    options = [];
  }
  let excluded = p.excluded_student_ids;
  if (typeof excluded === 'string') {
    try { excluded = JSON.parse(excluded); } catch (e) { excluded = []; }
  }
  if (!Array.isArray(excluded)) {
    excluded = [];
  }
  return {
    id: p.id,
    staffId: p.staff_id,
    classroomId: p.classroom_id,
    question: p.question,
    options,
    allowMultiple,
    status: p.status,
    itemType: p.item_type,
    excludedStudentIds: excluded,
    expiresAt,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
}

function parseResponseAnswer(answerField, fallbackTime) {
  let answerText = answerField;
  let rawChoice = null;
  let queryText = '';
  let replyText = '';
  let messages = [];
  if (answerText && answerText.startsWith('{')) {
    try {
      const parsed = JSON.parse(answerText);
      rawChoice = parsed.choice;
      if (Array.isArray(parsed.choice)) {
        answerText = parsed.choice.join(', ');
      } else {
        answerText = parsed.choice;
      }
      queryText = parsed.query || '';
      replyText = parsed.staffReply || '';
      messages = parsed.messages || [];
    } catch (e) {}
  } else {
    rawChoice = answerText;
  }
  
  if (messages.length === 0 && (queryText || replyText)) {
    if (queryText) messages.push({ sender: 'student', text: queryText, time: fallbackTime });
    if (replyText) messages.push({ sender: 'staff', text: replyText, time: fallbackTime });
  }
  
  return { answerText, rawChoice, queryText, replyText, messages };
}

function mapResponse(r) {
  if (!r) return null;
  const parsed = parseResponseAnswer(r.answer, r.submitted_at);
  return {
    id: r.id,
    pollId: r.poll_id,
    studentId: r.student_id,
    answer: parsed.answerText,
    choice: parsed.rawChoice,
    query: parsed.queryText,
    staffReply: parsed.replyText,
    messages: parsed.messages,
    submittedAt: r.submitted_at
  };
}

module.exports = {
  mapClassroom,
  mapStudent,
  mapPoll,
  mapResponse,
  parseResponseAnswer
};
