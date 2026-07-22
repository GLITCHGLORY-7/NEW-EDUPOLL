import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Search, ArrowLeft, Reply, Trash2, MessageSquare, X } from 'lucide-react';
import { 
  getConversations, getMessages, sendMessage as apiSendMessage,
  getOrCreateConversation, deleteMessage as apiDeleteMessage,
  getClassroomStaff, getCurrentUser, getStudentProfile,
  deleteConversation as apiDeleteConversation
} from '../services/api';

function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function Avatar({ name, role, size = 40 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';
  const color = role === 'staff' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#10b981,#059669)';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff', flexShrink: 0
    }}>{initials}</div>
  );
}

export default function StudentMessages() {
  const user = getCurrentUser();
  const [conversations, setConversations] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [classroomId, setClassroomId] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [isDeletingMsg, setIsDeletingMsg] = useState(null);
  const [isDeletingConv, setIsDeletingConv] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollInterval = useRef(null);
  const [undoTimers, setUndoTimers] = useState({});

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const getSpecificClassroomIdForStaff = (staffId) => {
    if (studentProfile?.classrooms && Array.isArray(studentProfile.classrooms)) {
      const room = studentProfile.classrooms.find(c => c.staff_id === staffId);
      if (room) return room.id;
    }
    return studentProfile?.classroom_id || '';
  };

  useEffect(() => {
    async function init() {
      try {
        const profile = await getStudentProfile();
        setStudentProfile(profile);
        
        let cIdsStr = '';
        if (profile?.classrooms && Array.isArray(profile.classrooms) && profile.classrooms.length > 0) {
          cIdsStr = profile.classrooms.map(c => c.id).join(',');
        } else {
          cIdsStr = profile?.classroom_id || JSON.parse(localStorage.getItem('user') || '{}').classroomId || '';
        }
        setClassroomId(cIdsStr);

        const [convs, staffList] = await Promise.all([
          getConversations().catch(() => []),
          cIdsStr ? getClassroomStaff(cIdsStr).catch(() => []) : Promise.resolve([])
        ]);
        setConversations(Array.isArray(convs) ? convs : []);
        setStaff(Array.isArray(staffList) ? staffList : []);
      } catch {} finally { setLoading(false); }
    }
    init();
  }, []);

  const loadMessages = useCallback(async (convId) => {
    try {
      const data = await getMessages(convId);
      setMessages(prev => {
        const pending = prev.filter(m => m.is_sending);
        const undoableIds = new Set(prev.filter(m => m.is_undoable).map(m => m.id));
        const dataIds = new Set(data.map(m => m.id));
        const uniquePending = pending.filter(m => !dataIds.has(m.id));
        const mergedData = data.map(m => undoableIds.has(m.id) ? { ...m, is_undoable: true } : m);
        return [...mergedData, ...uniquePending];
      });
      setTimeout(scrollToBottom, 100);
    } catch {}
  }, []);

  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv.id);
    clearInterval(pollInterval.current);
    pollInterval.current = setInterval(() => loadMessages(selectedConv.id), 5000);
    return () => clearInterval(pollInterval.current);
  }, [selectedConv, loadMessages]);

  const handleSelectStaff = async (staffMember) => {
    try {
      const specificClassroomId = getSpecificClassroomIdForStaff(staffMember.id);
      const conv = await getOrCreateConversation(staffMember.id, specificClassroomId);
      setConversations(prev => {
        if (prev.find(c => c.id === conv.id)) return prev;
        return [conv, ...prev];
      });
      setSelectedConv(conv);
      setMobileShowChat(true);
      setReplyTo(null);
    } catch {}
  };

  const handleSelectConv = (conv) => {
    setSelectedConv(conv);
    setMobileShowChat(true);
    setReplyTo(null);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedConv || sending) return;
    const msgText = text.trim();
    setText('');
    const targetReplyTo = replyTo;
    setReplyTo(null);

    const temp = {
      id: 'temp-' + Date.now(), text: msgText,
      sender_id: user.id, sender_name: user.name, sender_role: 'student',
      created_at: new Date().toISOString(), is_read: false,
      reply_preview: targetReplyTo?.text, reply_to_id: targetReplyTo?.id,
      is_sending: true
    };
    setMessages(prev => [...prev, temp]);
    setTimeout(scrollToBottom, 50);

    try {
      const sentMsg = await apiSendMessage(
        selectedConv.other_id, msgText, selectedConv.classroom_id || getSpecificClassroomIdForStaff(selectedConv.other_id),
        targetReplyTo?.id, targetReplyTo?.text
      );
      
      const undoableMsg = { ...sentMsg, is_undoable: true };
      setMessages(prev => prev.map(m => m.id === temp.id ? undoableMsg : m));
      
      const timeoutId = setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === sentMsg.id ? { ...m, is_undoable: false } : m));
        setUndoTimers(prev => {
          const next = { ...prev };
          delete next[sentMsg.id];
          return next;
        });
      }, 900000);

      setUndoTimers(prev => ({ ...prev, [sentMsg.id]: timeoutId }));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== temp.id));
    }
    inputRef.current?.focus();
  };

  const handleUndo = async (msgId) => {
    const timeoutId = undoTimers[msgId];
    if (timeoutId) {
      clearTimeout(timeoutId);
      setUndoTimers(prev => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
    }
    const msg = messages.find(m => m.id === msgId);
    if (msg) {
      setText(msg.text);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      try {
        await apiDeleteMessage(msgId);
      } catch {}
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async (msgId) => {
    setIsDeletingMsg(msgId);
  };

  const confirmDeleteMsg = async () => {
    if (!isDeletingMsg) return;
    try {
      await apiDeleteMessage(isDeletingMsg);
      setMessages(prev => prev.map(m => m.id === isDeletingMsg ? { ...m, is_deleted: true, text: 'This message was deleted.' } : m));
    } catch {}
    setIsDeletingMsg(null);
  };

  const handleDeleteConv = async (convId) => {
    setIsDeletingConv(convId);
  };

  const confirmDeleteConv = async () => {
    if (!isDeletingConv) return;
    try {
      await apiDeleteConversation(isDeletingConv);
      setConversations(prev => prev.filter(c => c.id !== isDeletingConv));
      if (selectedConv?.id === isDeletingConv) setSelectedConv(null);
      if (window.showToast) window.showToast("Conversation deleted successfully!", "success");
    } catch {
      if (window.showToast) window.showToast("Failed to delete conversation.", "error");
    }
    setIsDeletingConv(null);
  };

  const grouped = [];
  let lastDay = '';
  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const today = new Date();
    const yest = new Date(today); yest.setDate(yest.getDate() - 1);
    const label = d.toDateString() === today.toDateString() ? 'Today'
      : d.toDateString() === yest.toDateString() ? 'Yesterday'
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
    if (label !== lastDay) { grouped.push({ type: 'day', label }); lastDay = label; }
    grouped.push({ type: 'msg', msg });
  }

  const staffIds = new Set(staff.map(s => s.id));

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: 'var(--bg-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      
      <div style={{ width: 300, minWidth: 260, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--surface)', ...(mobileShowChat ? { display: 'none' } : {}) }}>
        <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Messages</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chat with your teachers</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {staff.length > 0 && (
            <div style={{ padding: '0.75rem 1rem 0.25rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Your Teachers</div>
              {staff.filter(s => s.id !== 'SAIRAM').map(s => {
                const existingConv = conversations.find(c => c.other_id === s.id);
                return (
                  <div key={s.id} onClick={() => existingConv ? handleSelectConv(existingConv) : handleSelectStaff(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.625rem 0.25rem', cursor: 'pointer', borderRadius: 'var(--radius-md)',
                      background: selectedConv?.other_id === s.id ? 'rgba(94,106,210,0.12)' : 'transparent',
                      transition: 'all 0.15s', marginBottom: '0.25rem'
                    }}>
                    <Avatar name={s.name} role="staff" size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{s.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.position || 'Staff'}</div>
                    </div>
                    {existingConv?.unread_count > 0 && (
                      <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '1rem', fontWeight: 700 }}>{existingConv.unread_count}</span>
                    )}
                    {existingConv && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConv(existingConv.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '0.25rem'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Delete Conversation"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {conversations.filter(c => !staffIds.has(c.other_id)).length > 0 && (
            <div style={{ padding: '0.75rem 1rem 0.25rem', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Other Conversations</div>
              {conversations.filter(c => !staffIds.has(c.other_id)).map(conv => (
                <div key={conv.id} onClick={() => handleSelectConv(conv)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.625rem 0.25rem', cursor: 'pointer', borderRadius: 'var(--radius-md)',
                    background: selectedConv?.id === conv.id ? 'rgba(94,106,210,0.12)' : 'transparent',
                    transition: 'all 0.15s', marginBottom: '0.25rem'
                  }}>
                  <Avatar name={conv.other_name} role={conv.other_role} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{conv.other_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.last_message || 'No messages'}</div>
                  </div>
                  {conv.unread_count > 0 && (
                    <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '1rem', fontWeight: 700 }}>{conv.unread_count}</span>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConv(conv.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '0.25rem'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="Delete Conversation"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedConv ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
            <MessageSquare size={56} style={{ opacity: 0.1 }} />
            <h3 style={{ color: 'var(--text-main)', margin: 0 }}>Select a teacher to message</h3>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Choose a teacher from the left to start a conversation</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--surface)' }}>
              <button onClick={() => { setMobileShowChat(false); setSelectedConv(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
                <ArrowLeft size={20} />
              </button>
              <Avatar name={selectedConv.other_name} role="staff" size={36} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{selectedConv.other_name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Staff</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'var(--bg-color)' }}>
              {grouped.map((item, idx) => {
                if (item.type === 'day') return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'center', margin: '0.75rem 0' }}>
                    <span style={{ background: 'var(--surface)', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '0.2rem 0.75rem', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>{item.label}</span>
                  </div>
                );
                const msg = item.msg;
                const isMine = msg.sender_id === user.id;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '0.5rem', margin: '0.2rem 0', position: 'relative' }}
                    className="msg-row">
                    {!isMine && <Avatar name={msg.sender_name} role="staff" size={26} />}
                    <div style={{
                      maxWidth: '70%', borderRadius: '1rem', padding: '0.5rem 0.875rem',
                      background: isMine ? 'linear-gradient(135deg,#5e6ad2,#7c3aed)' : 'var(--surface)',
                      color: isMine ? '#fff' : 'var(--text-main)',
                      border: isMine ? 'none' : '1px solid var(--border-color)',
                      borderBottomRightRadius: isMine ? '0.25rem' : '1rem',
                      borderBottomLeftRadius: isMine ? '1rem' : '0.25rem',
                      opacity: msg.is_deleted ? 0.5 : 1,
                      fontStyle: msg.is_deleted ? 'italic' : 'normal'
                    }}>
                      {msg.reply_preview && (
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem', padding: '0.35rem 0.5rem', marginBottom: '0.35rem', fontSize: '0.75rem', opacity: 0.85 }}>
                          <div style={{ width: 3, borderRadius: 2, background: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                          <span>{msg.reply_preview}</span>
                        </div>
                      )}
                      <div style={{ fontSize: '0.875rem', lineHeight: 1.45 }}>{msg.text}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{formatTime(msg.created_at)}</span>
                        {isMine && !msg.is_sending && <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{msg.is_read ? '✓✓' : '✓'}</span>}
                      </div>
                      {msg.is_undoable && (
                        <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleUndo(msg.id)}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                          >
                            Undo / Edit
                          </button>
                        </div>
                      )}
                    </div>
                    {!msg.is_deleted && !msg.is_sending && !msg.is_undoable && (
                      <div style={{ display: 'flex', gap: '0.2rem', opacity: 1 }} className="msg-actions">
                        <button title="Reply" onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                          style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Reply size={11} />
                        </button>
                        <button title="Delete" onClick={() => handleDelete(msg.id)}
                          style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {selectedConv.other_id === 'SAIRAM' ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-hover)', fontStyle: 'italic', borderTop: '1px solid var(--border-color)' }}>
                You cannot reply to Admin announcements.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-color)', background: 'var(--surface)' }}>
                {replyTo && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1.25rem', background: 'rgba(94,106,210,0.12)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--accent)' }}>
                      <Reply size={13} />
                      <span>Replying: {replyTo.text.substring(0, 50)}{replyTo.text.length > 50 ? '...' : ''}</span>
                    </div>
                    <button onClick={() => setReplyTo(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={13} /></button>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', padding: '0.875rem 1.25rem' }}>
                  <textarea
                    ref={inputRef}
                    style={{ flex: 1, borderRadius: '1.5rem', padding: '0.625rem 1rem', resize: 'none', minHeight: 42, maxHeight: 100, fontSize: '0.875rem', lineHeight: 1.4 }}
                    placeholder="Type a message..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                  <button onClick={handleSend} disabled={!text.trim() || sending}
                    style={{ background: text.trim() ? 'var(--accent)' : 'var(--surface-hover)', border: 'none', color: text.trim() ? '#fff' : 'var(--text-muted)', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}>
                    <Send size={17} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Modern Alert Modals */}
      {isDeletingMsg && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e1e24', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 1rem', color: 'white' }}>Delete Message</h3>
            <p style={{ margin: '0 0 1.5rem', color: '#a1a1aa' }}>Are you sure you want to delete this message?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsDeletingMsg(null)} style={{ background: 'transparent', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={confirmDeleteMsg} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {isDeletingConv && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1e1e24', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '0.75rem', width: '90%', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 1rem', color: 'white' }}>Delete Conversation</h3>
            <p style={{ margin: '0 0 1.5rem', color: '#a1a1aa' }}>Are you sure you want to delete this conversation and all its messages? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsDeletingConv(null)} style={{ background: 'transparent', color: 'white', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={confirmDeleteConv} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
