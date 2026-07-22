import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Search, ArrowLeft, MoreVertical, Trash2, Reply, MessageSquare, Plus, X } from 'lucide-react';
import { 
  getConversations, getMessages, sendMessage as apiSendMessage, 
  getOrCreateConversation, deleteMessage as apiDeleteMessage,
  getCurrentUser, getClassrooms, getStudents, getClassroomStaff,
  deleteConversation as apiDeleteConversation
} from '../services/api';
import styles from './Messages.module.css';

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

function formatDay(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Avatar({ name, role, size = 40 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';
  const colors = role === 'student' 
    ? 'linear-gradient(135deg, #10b981, #059669)' 
    : 'linear-gradient(135deg, #6366f1, #8b5cf6)';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: colors,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff', flexShrink: 0
    }}>
      {initials}
    </div>
  );
}

export default function Messages() {
  const user = getCurrentUser();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [contactSearch, setContactSearch] = useState('');
  const [contacts, setContacts] = useState([]);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const pollInterval = useRef(null);
  const [undoTimers, setUndoTimers] = useState({});

  const [isDeletingMsg, setIsDeletingMsg] = useState(null);
  const [isDeletingConv, setIsDeletingConv] = useState(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch {}
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
  }, [scrollToBottom]);

  useEffect(() => {
    loadConversations().finally(() => setLoading(false));
    
    async function loadContacts() {
      try {
        if (user.role === 'staff' || user.id === 'SAIRAM') {
          const [staffRes, studentsList] = await Promise.all([
            fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/staff`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }).then(r => r.json()).catch(() => []),
            getStudents().catch(() => [])
          ]);
          const staffList = Array.isArray(staffRes) ? staffRes : [];
          const validStaff = staffList.filter(s => s.id !== user.id).map(s => ({ ...s, role: 'staff' }));
          
          // Add Admin to the top of the staff list so staff can message the Admin
          if (user.id !== 'SAIRAM') {
            validStaff.unshift({
              id: 'SAIRAM',
              name: 'SAIRAM (Admin)',
              role: 'Admin',
              email: 'admin@edupoll.com'
            });
          }

          const validStudents = Array.isArray(studentsList) ? studentsList.map(s => ({ ...s, role: 'student' })) : [];
          setContacts([...validStaff, ...validStudents]);
        } else {
          // Student: get staff in their classrooms
          const profile = JSON.parse(localStorage.getItem('user') || '{}');
          if (profile.classroomId) {
            const staffList = await getClassroomStaff(profile.classroomId);
            // Allow messaging admin as well? The user asked to find admin.
            // But earlier they said student cannot message admin directly. 
            // The prompt says "I CANNOT FIND THE STUDENTS AND STAFFS AND ADMIN". That refers to the staff portal since student portal has a hardcoded list of staff.
            setContacts(staffList.map(s => ({ ...s, role: 'staff', classroomId: profile.classroomId })));
          }
        }
      } catch {}
    }
    loadContacts();
  }, []);

  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv.id);
    clearInterval(pollInterval.current);
    pollInterval.current = setInterval(() => loadMessages(selectedConv.id), 5000);
    return () => clearInterval(pollInterval.current);
  }, [selectedConv, loadMessages]);

  const handleSelectConv = (conv) => {
    setSelectedConv(conv);
    setMobileShowChat(true);
    setReplyTo(null);
    loadMessages(conv.id);
    // Update unread badge locally
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
  };

  const handleStartChat = async (contact) => {
    try {
      const conv = await getOrCreateConversation(contact.id, contact.classroomId);
      setShowNewChat(false);
      setContactSearch('');
      setConversations(prev => {
        if (prev.find(c => c.id === conv.id)) return prev.map(c => c.id === conv.id ? { ...c, ...conv } : c);
        return [conv, ...prev];
      });
      handleSelectConv(conv);
    } catch {}
  };

  const handleSend = async () => {
    if (!text.trim() || !selectedConv || sending) return;
    
    // Instead of locking sending state, we allow optimistic sends
    const msgText = text.trim();
    setText('');
    const targetReplyTo = replyTo;
    setReplyTo(null);
    
    // Optimistic update
    const tempMsg = {
      id: 'temp-' + Date.now(),
      text: msgText,
      sender_id: user.id,
      sender_name: user.name,
      sender_role: user.role,
      created_at: new Date().toISOString(),
      is_read: false,
      reply_preview: targetReplyTo?.text,
      reply_to_id: targetReplyTo?.id,
      is_sending: true
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(scrollToBottom, 50);
    
    try {
      const sentMsg = await apiSendMessage(
        selectedConv.other_id, msgText, selectedConv.classroom_id,
        targetReplyTo?.id, targetReplyTo?.text
      );
      
      const undoableMsg = { ...sentMsg, is_undoable: true };
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? undoableMsg : m));
      
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
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
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
      if (selectedConv?.id === isDeletingConv) {
        setSelectedConv(null);
      }
      if (window.showToast) window.showToast("Conversation deleted successfully!", "success");
    } catch {
      if (window.showToast) window.showToast("Failed to delete conversation.", "error");
    }
    setIsDeletingConv(null);
  };

  const filteredConvs = conversations.filter(c =>
    !search || c.other_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredContacts = contacts.filter(c =>
    !contactSearch || c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.id?.toLowerCase().includes(contactSearch.toLowerCase())
  );

  // Group messages by day
  const groupedMessages = [];
  let lastDay = '';
  for (const msg of messages) {
    const day = formatDay(msg.created_at);
    if (day !== lastDay) { groupedMessages.push({ type: 'day', day }); lastDay = day; }
    groupedMessages.push({ type: 'msg', msg });
  }

  return (
    <div className={styles.container}>
      {/* ── LEFT PANEL ── */}
      <div className={`${styles.sidebar} ${mobileShowChat ? styles.mobileHidden : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Messages</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className={styles.newChatBtn} onClick={() => setShowNewChat(true)} title="New Message">
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.convList}>
          {loading && <div className={styles.emptyState}>Loading...</div>}
          {!loading && filteredConvs.length === 0 && (
            <div className={styles.emptyState}>
              <MessageSquare size={32} style={{ opacity: 0.3 }} />
              <p>No conversations yet.<br/>Start a new chat!</p>
            </div>
          )}
          {filteredConvs.map(conv => (
            <div
              key={conv.id}
              className={`${styles.convItem} ${selectedConv?.id === conv.id ? styles.convItemActive : ''}`}
              onClick={() => handleSelectConv(conv)}
            >
              <Avatar name={conv.other_name} role={conv.other_role} size={44} />
              <div className={styles.convInfo}>
                <div className={styles.convTopRow}>
                  <span className={styles.convName}>{conv.other_name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={styles.convTime}>{conv.last_message_at ? timeAgo(conv.last_message_at) : ''}</span>
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
                </div>
                <div className={styles.convBottomRow}>
                  <span className={styles.convPreview}>{conv.last_message || 'Start a conversation'}</span>
                  {conv.unread_count > 0 && (
                    <span className={styles.unreadBadge}>{conv.unread_count > 9 ? '9+' : conv.unread_count}</span>
                  )}
                </div>
                {conv.other_role && (
                  <span className={`${styles.roleChip} ${conv.other_role === 'student' ? styles.roleStudent : styles.roleStaff}`}>
                    {conv.other_role}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CHAT PANEL ── */}
      <div className={`${styles.chatArea} ${!mobileShowChat && !selectedConv ? styles.mobileHidden : ''}`}>
        {!selectedConv ? (
          <div className={styles.emptyChat}>
            <MessageSquare size={64} style={{ opacity: 0.1 }} />
            <h3>Select a conversation</h3>
            <p>Choose from your existing conversations or start a new one</p>
            <button className={styles.newChatBtnLarge} onClick={() => setShowNewChat(true)}>
              <Plus size={16} /> New Message
            </button>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className={styles.chatHeader}>
              <button className={styles.backBtn} onClick={() => { setMobileShowChat(false); setSelectedConv(null); }}>
                <ArrowLeft size={20} />
              </button>
              <Avatar name={selectedConv.other_name} role={selectedConv.other_role} size={38} />
              <div className={styles.chatHeaderInfo}>
                <span className={styles.chatHeaderName}>{selectedConv.other_name}</span>
                <span className={styles.chatHeaderSub}>
                  {selectedConv.other_role === 'student' ? 'Student' : 'Staff'}
                  {selectedConv.classroom_id ? ` · ${selectedConv.classroom_id}` : ''}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messagesList}>
              {groupedMessages.map((item, idx) => {
                if (item.type === 'day') {
                  return (
                    <div key={`day-${idx}`} className={styles.dayDivider}>
                      <span>{item.day}</span>
                    </div>
                  );
                }
                const msg = item.msg;
                const isMine = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={`${styles.msgRow} ${isMine ? styles.msgRowRight : styles.msgRowLeft}`}>
                    {!isMine && <Avatar name={msg.sender_name} role={msg.sender_role} size={28} />}
                    <div className={`${styles.msgBubble} ${isMine ? styles.msgBubbleMine : styles.msgBubbleOther} ${msg.is_deleted ? styles.msgDeleted : ''}`}>
                      {msg.reply_preview && (
                        <div className={styles.replyPreview}>
                          <div className={styles.replyBar} />
                          <span>{msg.reply_preview}</span>
                        </div>
                      )}
                      {!isMine && <div className={styles.msgSenderName}>{msg.sender_name}</div>}
                      <div className={styles.msgText}>{msg.text}</div>
                      <div className={styles.msgMeta}>
                        <span className={styles.msgTime}>{formatTime(msg.created_at)}</span>
                        {isMine && !msg.is_sending && <span className={styles.readStatus}>{msg.is_read ? '✓✓' : '✓'}</span>}
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
                      <div className={styles.msgActions}>
                        <button title="Reply" onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}>
                          <Reply size={12} />
                        </button>
                        <button title="Delete" onClick={() => handleDelete(msg.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div className={styles.replyBar}>
                <div className={styles.replyBarContent}>
                  <Reply size={14} />
                  <span>Replying to: {replyTo.text.substring(0, 60)}{replyTo.text.length > 60 ? '...' : ''}</span>
                </div>
                <button onClick={() => setReplyTo(null)}><X size={14} /></button>
              </div>
            )}

            {/* Input */}
            <div className={styles.inputArea}>
              <textarea
                ref={inputRef}
                className={styles.messageInput}
                placeholder="Type a message..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className={`${styles.sendBtn} ${text.trim() ? styles.sendBtnActive : ''}`}
                onClick={handleSend}
                disabled={!text.trim() || sending}
              >
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── NEW CHAT MODAL ── */}
      {showNewChat && (
        <div className={styles.modalOverlay} onClick={() => setShowNewChat(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>New Message</h3>
              <button onClick={() => setShowNewChat(false)}><X size={18} /></button>
            </div>
            <div className={styles.modalSearch}>
              <Search size={15} />
              <input
                type="text"
                placeholder="Search people..."
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className={styles.contactList}>
              {filteredContacts.length === 0 && (
                <div className={styles.emptyState}>No people found</div>
              )}
              {filteredContacts.map(c => (
                <div key={c.id + (c.classroomId || '')} className={styles.contactItem} onClick={() => handleStartChat(c)}>
                  <Avatar name={c.name} role={c.role} size={36} />
                  <div>
                    <div className={styles.contactName}>{c.name}</div>
                    <div className={styles.contactSub}>
                      {c.role === 'staff' ? (c.position || 'Staff') : c.id} 
                      {c.classroomId ? ` · ${c.classroomId}` : ''}
                    </div>
                  </div>
                  <span className={`${styles.roleChip} ${c.role === 'student' ? styles.roleStudent : styles.roleStaff}`}>
                    {c.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Modern Alert Modals */}
      {isDeletingMsg && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalAlert}>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--text-main)' }}>Delete Message</h3>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)' }}>Are you sure you want to delete this message?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsDeletingMsg(null)} className={styles.cancelBtn}>Cancel</button>
              <button onClick={confirmDeleteMsg} className={styles.deleteBtn}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {isDeletingConv && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalAlert}>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--text-main)' }}>Delete Conversation</h3>
            <p style={{ margin: '0 0 1.5rem', color: 'var(--text-muted)' }}>Are you sure you want to delete this conversation and all its messages? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsDeletingConv(null)} className={styles.cancelBtn}>Cancel</button>
              <button onClick={confirmDeleteConv} className={styles.deleteBtn}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
