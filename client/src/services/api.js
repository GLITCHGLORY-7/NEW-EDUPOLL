const API_URL = import.meta.env.VITE_API_URL || '/api';



function getAuthHeader() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// Custom authenticated fetch wrapper that handles token expiration/invalidation
async function authFetch(url, options = {}) {
  const headers = getAuthHeader();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });

  if (res.status === 401) {
    logout();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  return res;
}

export async function login(loginId, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId: loginId.trim(), password })
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Login failed');
  }
  const data = await res.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function registerStaff(name, email, loginId, password, gender, position) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, loginId, password, gender, position })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export async function getClassrooms() {
  const res = await authFetch(`${API_URL}/classrooms`);
  if (!res.ok) throw new Error('Failed to fetch classrooms');
  return res.json();
}

export async function createClassroom(classroomData) {
  const res = await authFetch(`${API_URL}/classrooms`, {
    method: 'POST',
    body: JSON.stringify(classroomData)
  });
  if (!res.ok) throw new Error('Failed to create classroom');
  return res.json();
}

export async function updateClassroom(classroomId, classroomData) {
  const res = await authFetch(`${API_URL}/classrooms/${classroomId}`, {
    method: 'PUT',
    body: JSON.stringify(classroomData)
  });
  if (!res.ok) throw new Error('Failed to update classroom');
  return res.json();
}

export async function deleteClassroom(classroomId) {
  const res = await authFetch(`${API_URL}/classrooms/${classroomId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete classroom');
  return res.json();
}

export async function getStudents() {
  const res = await authFetch(`${API_URL}/students`);
  if (!res.ok) throw new Error('Failed to fetch students');
  return res.json();
}

export async function createStudent(studentData) {
  const res = await authFetch(`${API_URL}/students`, {
    method: 'POST',
    body: JSON.stringify(studentData)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create student');
  }
  return res.json();
}

export async function updateStudent(studentId, studentData) {
  const res = await authFetch(`${API_URL}/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(studentData)
  });
  if (!res.ok) throw new Error('Failed to update student');
  return res.json();
}

export async function deleteStudent(studentId, classroomId) {
  const query = classroomId ? `?classroomId=${classroomId}` : '';
  const res = await authFetch(`${API_URL}/students/${studentId}${query}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete student');
  return res.json();
}

export async function updateStaff(staffId, staffData) {
  const res = await authFetch(`${API_URL}/staff/${staffId}`, {
    method: 'PUT',
    body: JSON.stringify(staffData)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getStaffPolls() {
  const res = await authFetch(`${API_URL}/polls`);
  if (!res.ok) throw new Error('Failed to fetch polls');
  return res.json();
}

export async function getPollsResponsesSummary() {
  const res = await authFetch(`${API_URL}/polls/responses-summary`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function createPoll(pollData) {
  const res = await authFetch(`${API_URL}/polls`, {
    method: 'POST',
    body: JSON.stringify(pollData)
  });
  if (!res.ok) throw new Error('Failed to create poll');
  return res.json();
}

export async function updatePoll(pollId, pollData) {
  const res = await authFetch(`${API_URL}/polls/${pollId}`, {
    method: 'PUT',
    body: JSON.stringify(pollData)
  });
  if (!res.ok) throw new Error('Failed to update poll');
  return res.json();
}

export async function deletePoll(pollId) {
  const res = await authFetch(`${API_URL}/polls/${pollId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete poll');
  return res.json();
}

export async function getPollResults(pollId, classroomId = '') {
  const url = classroomId ? `${API_URL}/polls/${pollId}/results?classroomId=${classroomId}` : `${API_URL}/polls/${pollId}/results`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error('Failed to fetch results');
  return res.json();
}

export async function deleteStudentResponse(pollId, studentId) {
  const res = await authFetch(`${API_URL}/polls/${pollId}/responses/${studentId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete response');
  return res.json();
}

export async function getStudentActivePolls() {
  const res = await authFetch(`${API_URL}/student/polls`);
  if (!res.ok) throw new Error('Failed to fetch student active polls');
  return res.json();
}

export async function getStudentActivePoll(pollId) {
  const res = await authFetch(`${API_URL}/student/polls/${pollId}`);
  if (!res.ok) throw new Error(await res.text() || 'Failed to fetch poll details');
  return res.json();
}

export async function submitPollAnswer(pollId, answer, query = '') {
  const res = await authFetch(`${API_URL}/student/polls/${pollId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ answer, query })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function replyToStudentQuery(pollId, studentId, reply) {
  const res = await authFetch(`${API_URL}/polls/${pollId}/responses/${studentId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getStudentAllPolls() {
  const res = await authFetch(`${API_URL}/student/polls/all`);
  if (!res.ok) throw new Error('Failed to fetch student poll list');
  return res.json();
}

export async function getStudentResponses(options = {}) {
  const queryParam = options.history ? '?history=true' : '';
  const res = await authFetch(`${API_URL}/student/responses${queryParam}`);
  if (!res.ok) throw new Error('Failed to fetch student responses');
  return res.json();
}

// Student deletes their own query (uses student route, not staff route)
export async function deleteMyQuery(pollId) {
  const encodedPollId = encodeURIComponent(pollId);
  const res = await authFetch(`${API_URL}/student/responses/${encodedPollId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete query');
  }
  return res.json();
}

export async function getStudentProfile() {
  const res = await authFetch(`${API_URL}/student/me`);
  if (!res.ok) throw new Error('Failed to fetch student profile');
  return res.json();
}

export async function generateAiSummary(pollData) {
  const res = await authFetch(`${API_URL}/ai/generate-summary`, {
    method: 'POST',
    body: JSON.stringify(pollData)
  });
  if (!res.ok) throw new Error('Failed to generate summary');
  return res.json();
}

export async function generateAiPoll(topic, classroomId) {
  const res = await authFetch(`${API_URL}/ai/generate-poll`, {
    method: 'POST',
    body: JSON.stringify({ topic, classroomId })
  });
  if (!res.ok) throw new Error('Failed to generate poll');
  return res.json();
}

export async function getNotifications() {
  const res = await authFetch(`${API_URL}/staff/notifications`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function sendMessageToStudent(studentId, message) {
  const res = await authFetch(`${API_URL}/polls/GENERAL/responses/${studentId}/message`, {
    method: 'POST',
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error(await res.text() || 'Failed to send message');
  return res.json();
}

export async function deleteStudentResponseByPoll(pollId) {
  const res = await authFetch(`${API_URL}/student/responses/${pollId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete response');
  return res.json();
}

export async function deleteStudentResponseById(responseId) {
  const res = await authFetch(`${API_URL}/student/responses/id/${responseId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete response history');
  return res.json();
}

export async function clearAllResponsesForPoll(pollId) {
  const res = await authFetch(`${API_URL}/polls/${pollId}/responses/all`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to clear poll responses');
  return res.json();
}

// ── MESSAGES API ──────────────────────────────────────────────
export async function getConversations() {
  const res = await authFetch(`${API_URL}/messages/conversations`);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function getMessages(conversationId) {
  const res = await authFetch(`${API_URL}/messages/${conversationId}`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export async function sendMessage(recipientId, text, classroomId, replyToId, replyPreview) {
  const res = await authFetch(`${API_URL}/messages`, {
    method: 'POST',
    body: JSON.stringify({ recipientId, text, classroomId, replyToId, replyPreview })
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export async function getOrCreateConversation(recipientId, classroomId) {
  const res = await authFetch(`${API_URL}/messages/conversation`, {
    method: 'POST',
    body: JSON.stringify({ recipientId, classroomId })
  });
  if (!res.ok) throw new Error('Failed to get conversation');
  return res.json();
}

export async function deleteMessage(messageId) {
  const res = await authFetch(`${API_URL}/messages/${messageId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete message');
  return res.json();
}

export async function deleteConversation(conversationId) {
  const res = await authFetch(`${API_URL}/messages/conversations/${conversationId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete conversation');
  return res.json();
}

export async function getMessagesUnreadCount() {
  const res = await authFetch(`${API_URL}/messages/unread-count`);
  if (!res.ok) return { count: 0 };
  return res.json();
}

export async function getClassroomStaff(classroomId) {
  const res = await authFetch(`${API_URL}/messages/staff-list/${classroomId}`);
  if (!res.ok) throw new Error('Failed to fetch staff list');
  return res.json();
}

// ── ANNOUNCEMENTS API ─────────────────────────────────────────
export async function getAnnouncements(classroomId) {
  const q = classroomId ? `?classroomId=${classroomId}` : '';
  const res = await authFetch(`${API_URL}/announcements${q}`);
  if (!res.ok) throw new Error('Failed to fetch announcements');
  return res.json();
}

export async function createAnnouncement(data) {
  const res = await authFetch(`${API_URL}/announcements`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create announcement');
  return res.json();
}

export async function updateAnnouncement(id, data) {
  const res = await authFetch(`${API_URL}/announcements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update announcement');
  return res.json();
}

export async function deleteAnnouncement(id) {
  const res = await authFetch(`${API_URL}/announcements/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete announcement');
  return res.json();
}

export async function markAnnouncementRead(id) {
  const res = await authFetch(`${API_URL}/announcements/${id}/read`, { method: 'POST' });
  if (!res.ok) return;
  return res.json();
}

export async function getAnnouncementsUnreadCount() {
  const res = await authFetch(`${API_URL}/announcements/unread-count`);
  if (!res.ok) return { count: 0 };
  return res.json();
}

export async function getArchivedPolls() {
  const res = await authFetch(`${API_URL}/polls/archived`);
  if (!res.ok) throw new Error('Failed to fetch archived polls');
  return res.json();
}

export async function restorePoll(id) {
  const res = await authFetch(`${API_URL}/polls/${id}/restore`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to restore poll');
  return res.json();
}

export async function triggerCleanup() {
  const res = await authFetch(`${API_URL}/polls/cleanup`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to execute database cleanup');
  return res.json();
}
