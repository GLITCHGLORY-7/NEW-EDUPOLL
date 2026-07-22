const { supabase } = require('../database/db');

// GET /api/announcements — list for classroom or global
exports.getAnnouncements = async (req, res) => {
  const { classroomId } = req.query;
  
  try {
    let query = supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (req.user.role === 'staff') {
      // Staff: see global + their classroom announcements
      if (classroomId) {
        query = query.or(`classroom_id.eq.${classroomId},is_global.eq.true`);
      } else {
        // Get all classrooms this staff belongs to
        const { data: assignments } = await supabase
          .from('classroom_staff')
          .select('classroom_id')
          .eq('staff_id', req.user.id);
        const assignedIds = (assignments || []).map(a => a.classroom_id).filter(Boolean);

        const { data: staffClassrooms } = await supabase
          .from('classrooms')
          .select('id')
          .eq('staff_id', req.user.id);
        const legacyIds = (staffClassrooms || []).map(c => c.id).filter(Boolean);

        const ids = [...new Set([...assignedIds, ...legacyIds])];

        if (ids.length > 0) {
          query = query.or(`classroom_id.in.(${ids.join(',')}),is_global.eq.true`);
        } else {
          query = query.eq('is_global', true);
        }
      }
    } else if (req.user.role === 'student') {
      // Student: see global + their classroom
      const token = req.user;
      // Get student's classrooms
      const { data: studentRows } = await supabase
        .from('students')
        .select('classroom_id')
        .eq('id', req.user.id);
      
      const ids = [...new Set((studentRows || []).map(s => s.classroom_id).filter(Boolean))];
      if (ids.length > 0) {
        query = query.or(`classroom_id.in.(${ids.join(',')}),is_global.eq.true`);
      } else {
        query = query.eq('is_global', true);
      }
    }
    // Admin sees all

    const { data, error } = await query.limit(50);
    if (error) throw error;

    // Get read status for this user
    const annIds = (data || []).map(a => a.id);
    let readIds = new Set();
    if (annIds.length > 0) {
      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('reader_id', req.user.id)
        .in('announcement_id', annIds);
      readIds = new Set((reads || []).map(r => r.announcement_id));
    }

    const annotated = (data || []).map(a => ({
      ...a,
      is_read: readIds.has(a.id)
    }));

    res.json(annotated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
};

// POST /api/announcements — create announcement
exports.createAnnouncement = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });

  const { title, body, classroomId, isPinned, isGlobal } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body required' });

  // Only SAIRAM (admin) can create global announcements
  const actualGlobal = isGlobal && req.user.id === 'SAIRAM';

  // Get author info
  const { data: author } = await supabase
    .from('users')
    .select('name, position')
    .eq('id', req.user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from('announcements')
    .insert([{
      title,
      body,
      author_id: req.user.id,
      author_name: author?.name || req.user.id,
      author_position: author?.position || 'Staff',
      classroom_id: actualGlobal ? null : (classroomId || null),
      is_pinned: isPinned || false,
      is_global: actualGlobal,
      expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to create announcement' });
  res.json(data);
};

// PATCH /api/announcements/:id — update announcement
exports.updateAnnouncement = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });

  const { title, body, isPinned } = req.body;

  // Only the author or admin can edit
  const { data: existing } = await supabase
    .from('announcements')
    .select('author_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.author_id !== req.user.id && req.user.id !== 'SAIRAM') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { data, error } = await supabase
    .from('announcements')
    .update({ title, body, is_pinned: isPinned || false })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to update' });
  res.json(data);
};

// DELETE /api/announcements/:id
exports.deleteAnnouncement = async (req, res) => {
  if (req.user.role !== 'staff') return res.status(403).json({ error: 'Staff only' });

  const { data: existing } = await supabase
    .from('announcements')
    .select('author_id')
    .eq('id', req.params.id)
    .maybeSingle();

  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.author_id !== req.user.id && req.user.id !== 'SAIRAM') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { error } = await supabase.from('announcements').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'Failed to delete' });
  res.json({ success: true });
};

// POST /api/announcements/:id/read — mark as read
exports.markRead = async (req, res) => {
  const { data, error } = await supabase
    .from('announcement_reads')
    .upsert([{
      announcement_id: req.params.id,
      reader_id: req.user.id,
      reader_role: req.user.role
    }], { onConflict: 'announcement_id,reader_id' });

  if (error) return res.status(500).json({ error: 'Failed to mark read' });
  res.json({ success: true });
};

// GET /api/announcements/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    // Same filter logic as getAnnouncements
    let query = supabase.from('announcements').select('id');

    if (req.user.role === 'student') {
      const { data: studentRows } = await supabase
        .from('students').select('classroom_id').eq('id', req.user.id);
      const ids = [...new Set((studentRows || []).map(s => s.classroom_id).filter(Boolean))];
      if (ids.length > 0) {
        query = query.or(`classroom_id.in.(${ids.join(',')}),is_global.eq.true`);
      } else {
        query = query.eq('is_global', true);
      }
    } else if (req.user.role === 'staff') {
      const { data: staffClassrooms } = await supabase
        .from('classrooms').select('id').eq('staff_id', req.user.id);
      const ids = (staffClassrooms || []).map(c => c.id);
      if (ids.length > 0) {
        query = query.or(`classroom_id.in.(${ids.join(',')}),is_global.eq.true`);
      } else {
        query = query.eq('is_global', true);
      }
    }

    const { data: all } = await query;
    const allIds = (all || []).map(a => a.id);
    if (allIds.length === 0) return res.json({ count: 0 });

    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('reader_id', req.user.id)
      .in('announcement_id', allIds);

    const readCount = (reads || []).length;
    res.json({ count: allIds.length - readCount });
  } catch (err) {
    res.json({ count: 0 });
  }
};
