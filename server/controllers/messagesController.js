const { supabase } = require('../database/db');

// Helper: get or create a conversation between two users
async function getOrCreateConversation(userA, userB, classroomId, namesAndRoles) {
  // Normalize: always store with smaller id as participant_a
  const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
  const [nameA, nameB] = userA < userB 
    ? [namesAndRoles.nameA, namesAndRoles.nameB]
    : [namesAndRoles.nameB, namesAndRoles.nameA];
  const [roleA, roleB] = userA < userB
    ? [namesAndRoles.roleA, namesAndRoles.roleB]
    : [namesAndRoles.roleB, namesAndRoles.roleA];

  const queryVal = classroomId || null;
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('participant_a', a)
    .eq('participant_b', b);

  if (queryVal) {
    query = query.eq('classroom_id', queryVal);
  } else {
    query = query.or('classroom_id.is.null,classroom_id.eq.""');
  }

  const { data: existingList, error: findErr } = await query;
  if (findErr) throw findErr;

  if (existingList && existingList.length > 0) {
    return existingList[0];
  }

  const { data: newConv, error } = await supabase
    .from('conversations')
    .insert([{
      participant_a: a,
      participant_b: b,
      participant_a_name: nameA,
      participant_b_name: nameB,
      participant_a_role: roleA,
      participant_b_role: roleB,
      classroom_id: queryVal,
      last_message: null,
      last_message_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return newConv;
}

// GET /api/messages/conversations — list conversations for the logged-in user
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
      .order('last_message_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // For each conversation, get unread message count
    const convIds = (data || []).map(c => c.id);
    let unreadMap = {};
    if (convIds.length > 0) {
      const { data: unread } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('is_read', false)
        .neq('sender_id', userId)
        .eq('is_deleted', false);

      for (const m of (unread || [])) {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
      }
    }

    // Collect all distinct "other" participant IDs
    const otherIds = new Set();
    for (const c of (data || [])) {
      if (c.participant_a !== userId) otherIds.add(c.participant_a);
      if (c.participant_b !== userId) otherIds.add(c.participant_b);
    }
    const otherIdsArr = Array.from(otherIds);

    // Dynamically query their actual names and roles
    let namesMap = {};
    let rolesMap = {};

    if (otherIdsArr.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, role')
        .in('id', otherIdsArr);
      for (const u of (users || [])) {
        namesMap[u.id] = u.name;
        rolesMap[u.id] = u.role;
      }

      const { data: students } = await supabase
        .from('students')
        .select('id, name, role')
        .in('id', otherIdsArr);
      for (const s of (students || [])) {
        namesMap[s.id] = s.name;
        rolesMap[s.id] = s.role || 'student';
      }
    }

    // Add "other person" name dynamically resolved from DB
    const annotated = (data || []).map(c => {
      const isA = c.participant_a === userId;
      const otherId = isA ? c.participant_b : c.participant_a;
      const otherName = namesMap[otherId] || (isA ? c.participant_b_name : c.participant_a_name) || otherId;
      const otherRole = rolesMap[otherId] || (isA ? c.participant_b_role : c.participant_a_role) || 'student';
      return {
        ...c,
        other_id: otherId,
        other_name: otherName,
        other_role: otherRole,
        unread_count: unreadMap[c.id] || 0
      };
    });

    res.json(annotated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

// GET /api/messages/:conversationId — get messages for a conversation
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    // Verify user is part of this conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.participant_a !== userId && conv.participant_b !== userId) {
      return res.status(403).json({ error: 'Not part of this conversation' });
    }

    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) throw error;

    // Mark all messages from the other user as read
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    res.json(msgs || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// POST /api/messages — send a new message
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, text, classroomId, replyToId, replyPreview } = req.body;
    if (!recipientId || !text?.trim()) {
      return res.status(400).json({ error: 'recipientId and text required' });
    }

    const senderId = req.user.id;

    // Get sender info
    let senderName = senderId;
    let senderRole = req.user.role;
    if (senderRole === 'staff') {
      const { data: u } = await supabase.from('users').select('name').eq('id', senderId).maybeSingle();
      senderName = u?.name || senderId;
    } else {
      const { data: s } = await supabase.from('students').select('name').eq('id', senderId).limit(1);
      senderName = s?.[0]?.name || senderId;
    }

    // Get recipient info
    let recipientName = recipientId;
    let recipientRole = 'staff';
    const { data: staffUser } = await supabase.from('users').select('name, role').eq('id', recipientId).maybeSingle();
    if (staffUser) {
      recipientName = staffUser.name;
      recipientRole = staffUser.role;
    } else {
      const { data: studentUser } = await supabase.from('students').select('name').eq('id', recipientId).limit(1);
      if (studentUser?.[0]) {
        recipientName = studentUser[0].name;
        recipientRole = 'student';
      }
    }

    // Get or create conversation
    const conv = await getOrCreateConversation(senderId, recipientId, classroomId, {
      nameA: senderName,
      nameB: recipientName,
      roleA: senderRole,
      roleB: recipientRole
    });

    // Insert message
    const { data: msg, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conv.id,
        sender_id: senderId,
        sender_name: senderName,
        sender_role: senderRole,
        text: text.trim(),
        reply_to_id: replyToId || null,
        reply_preview: replyPreview || null,
        is_read: false,
        expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Update conversation last_message and last_message_at
    await supabase
      .from('conversations')
      .update({
        last_message: text.trim().substring(0, 100),
        last_message_at: new Date().toISOString()
      })
      .eq('id', conv.id);

    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// POST /api/messages/conversation — get or create conversation, return it
exports.getOrCreateConv = async (req, res) => {
  try {
    const { recipientId, classroomId } = req.body;
    if (!recipientId) return res.status(400).json({ error: 'recipientId required' });

    const senderId = req.user.id;
    let senderName = senderId;
    if (req.user.role === 'staff') {
      const { data: u } = await supabase.from('users').select('name').eq('id', senderId).maybeSingle();
      senderName = u?.name || senderId;
    } else {
      const { data: s } = await supabase.from('students').select('name').eq('id', senderId).limit(1);
      senderName = s?.[0]?.name || senderId;
    }

    let recipientName = recipientId;
    let recipientRole = 'staff';
    const { data: staffUser } = await supabase.from('users').select('name, role').eq('id', recipientId).maybeSingle();
    if (staffUser) { recipientName = staffUser.name; recipientRole = staffUser.role; }
    else {
      const { data: studentUser } = await supabase.from('students').select('name').eq('id', recipientId).limit(1);
      if (studentUser?.[0]) { recipientName = studentUser[0].name; recipientRole = 'student'; }
    }

    const conv = await getOrCreateConversation(senderId, recipientId, classroomId, {
      nameA: senderName,
      nameB: recipientName,
      roleA: req.user.role,
      roleB: recipientRole
    });

    const annotated = {
      ...conv,
      other_id: recipientId,
      other_name: recipientName,
      other_role: recipientRole,
      unread_count: 0
    };

    res.json(annotated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get/create conversation' });
  }
};

// DELETE /api/messages/:messageId — soft-delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const { data: msg } = await supabase
      .from('messages')
      .select('sender_id, conversation_id')
      .eq('id', req.params.messageId)
      .maybeSingle();

    if (!msg) return res.status(404).json({ error: 'Message not found' });

    // Allow deletion if: sender of message OR participant in the conversation
    if (msg.sender_id !== req.user.id) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('participant_a, participant_b')
        .eq('id', msg.conversation_id)
        .maybeSingle();
      
      if (!conv || (conv.participant_a !== req.user.id && conv.participant_b !== req.user.id)) {
        return res.status(403).json({ error: 'Not authorized to delete this message' });
      }
    }

    const { error: updateError } = await supabase
      .from('messages')
      .update({ is_deleted: true, text: 'This message was deleted.' })
      .eq('id', req.params.messageId);
    
    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw updateError;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error in deleteMessage:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// GET /api/messages/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    // Get all conversations the user is a part of
    const { data: convos } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_a.eq.${req.user.id},participant_b.eq.${req.user.id}`);
      
    if (!convos || convos.length === 0) {
      return res.json({ count: 0 });
    }
    
    const convoIds = convos.map(c => c.id);

    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', convoIds)
      .eq('is_read', false)
      .neq('sender_id', req.user.id)
      .eq('is_deleted', false);
    
    res.json({ count: count || 0 });
  } catch (err) {
    res.json({ count: 0 });
  }
};

// GET /api/messages/staff-list/:classroomId — get staff in classrooms for student to message
exports.getClassroomStaff = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const idsToQuery = classroomId.split(',');

    // 1. Get staff assigned via classroom_staff join table
    const { data: assignments } = await supabase
      .from('classroom_staff')
      .select('staff_id')
      .in('classroom_id', idsToQuery);
    
    let staffIds = (assignments || []).map(a => a.staff_id).filter(Boolean);

    // 2. Fallback to classrooms table's staff_id (backward compatibility)
    const { data: classrooms } = await supabase
      .from('classrooms')
      .select('staff_id')
      .in('id', idsToQuery);
    if (classrooms) {
      classrooms.forEach(c => {
        if (c.staff_id && !staffIds.includes(c.staff_id)) {
          staffIds.push(c.staff_id);
        }
      });
    }

    if (staffIds.length === 0) return res.json([]);

    const { data: staffList } = await supabase
      .from('users')
      .select('id, name, position, gender, last_seen')
      .in('id', staffIds)
      .neq('id', 'SAIRAM');

    res.json(staffList || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch staff list' });
  }
};

// DELETE /api/messages/conversations/:conversationId — delete a conversation and all its messages
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user is part of this conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (!conv) return res.status(404).json({ error: 'Conversation not found' });
    if (conv.participant_a !== userId && conv.participant_b !== userId) {
      return res.status(403).json({ error: 'Not part of this conversation' });
    }

    // Delete messages first
    const { error: msgErr } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (msgErr) throw msgErr;

    // Delete conversation
    const { error: convErr } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (convErr) throw convErr;

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};

exports.getOrCreateConversation = getOrCreateConversation;
