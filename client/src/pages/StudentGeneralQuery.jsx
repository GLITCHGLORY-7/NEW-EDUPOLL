import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, Trash2, X, Users, ChevronRight, ArrowLeft } from 'lucide-react';
import { submitPollAnswer, getCurrentUser, getStudentResponses, getStudentProfile, deleteMyQuery } from '../services/api';
import styles from './StudentActivePoll.module.css';

// ─── Modern Confirm Modal ────────────────────────────────────────────────────
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1e2a3a, #151f2e)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '380px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        animation: 'fadeInScale 0.2s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(92,103,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Trash2 size={18} color={danger ? '#ef4444' : '#5c67ff'} />
          </div>
          <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '0.55rem 1.25rem', borderRadius: '0.5rem',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '0.55rem 1.25rem', borderRadius: '0.5rem',
            background: danger ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#5c67ff,#7c3aed)',
            border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700,
            boxShadow: danger ? '0 4px 16px rgba(239,68,68,0.3)' : '0 4px 16px rgba(92,103,255,0.3)'
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Staff Selection Screen ──────────────────────────────────────────────────
function StaffSelectionScreen({ classrooms, responses, onSelect }) {
  return (
    <div style={{ animation: 'fadeInScale 0.3s ease' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 1rem',
          background: 'linear-gradient(135deg,rgba(92,103,255,0.2),rgba(124,58,237,0.2))',
          border: '2px solid rgba(92,103,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Users size={28} color="#818cf8" />
        </div>
        <h3 style={{ color: 'white', margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 700 }}>
          Select Your Instructor
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          You are enrolled in multiple classrooms. Choose which instructor you want to contact.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {classrooms.map(classroom => {
          const existingResp = responses.find(r =>
            r.pollId === `GENERAL_${classroom.id}` || r.pollId === 'GENERAL'
          );
          const hasConversation = !!(existingResp?.messages?.length > 0 || existingResp?.query);
          const hasUnread = existingResp?.messages?.some(m => m.sender === 'staff');

          return (
            <button
              key={classroom.id}
              onClick={() => onSelect(classroom)}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '0.875rem', cursor: 'pointer',
                textAlign: 'left', width: '100%', transition: 'all 0.2s',
                position: 'relative', overflow: 'hidden'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(92,103,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(92,103,255,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#5c67ff,#7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 700, color: 'white'
              }}>
                {classroom.name?.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: '0.95rem' }}>
                  {classroom.name}
                </p>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  {hasConversation ? '💬 Conversation in progress' : 'No messages yet — start a conversation'}
                </p>
              </div>

              {/* Unread dot */}
              {hasUnread && (
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: '#10b981', flexShrink: 0
                }} />
              )}

              <ChevronRight size={18} color="#475569" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chat View ───────────────────────────────────────────────────────────────
export default function StudentGeneralQuery() {
  const [loading, setLoading]                     = useState(true);
  const [classrooms, setClassrooms]               = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [allResponses, setAllResponses]           = useState([]);
  const [response, setResponse]                   = useState(null);
  const [queryText, setQueryText]                 = useState('');
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [confirmOpen, setConfirmOpen]             = useState(false);
  const navigate = useNavigate();

  // ── Load data ────────────────────────────────────────────────────────────
  const loadData = async (classroomId) => {
    try {
      const user = getCurrentUser();
      if (!user || user.role !== 'student') { navigate('/login'); return; }

      const [profile, respData] = await Promise.all([getStudentProfile(), getStudentResponses()]);

      const cls = profile?.classrooms || [];
      setClassrooms(cls);
      setAllResponses(respData || []);

      // Auto-select if only one classroom
      const targetId = classroomId || (cls.length === 1 ? cls[0].id : null);
      if (targetId) {
        const found = cls.find(c => c.id === targetId);
        if (found) {
          setSelectedClassroom(found);
          const pollId = `GENERAL_${targetId}`;
          const resp = (respData || []).find(r => r.pollId === pollId || (r.pollId === 'GENERAL' && cls.length === 1));
          setResponse(resp || null);
        }
      } else {
        setSelectedClassroom(null);
        setResponse(null);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSelectClassroom = (classroom) => {
    setSelectedClassroom(classroom);
    setQueryText('');
    const pollId = `GENERAL_${classroom.id}`;
    const resp = allResponses.find(r => r.pollId === pollId || (r.pollId === 'GENERAL' && classrooms.length === 1));
    setResponse(resp || null);
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!queryText.trim() || !selectedClassroom) return;
    setIsSubmitting(true);
    try {
      const pollId = `GENERAL_${selectedClassroom.id}`;
      await submitPollAnswer(pollId, 'General Query', queryText);
      setQueryText('');
      window.showToast(`Query sent to ${selectedClassroom.name}!`, 'success');
      await loadData(selectedClassroom.id);
    } catch (err) {
      console.error(err);
      window.showToast('Failed to send query.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Delete conversation ───────────────────────────────────────────────────
  const handleDelete = async () => {
    setConfirmOpen(false);
    setIsSubmitting(true);
    try {
      const pollId = `GENERAL_${selectedClassroom.id}`;
      await deleteMyQuery(pollId);
      setResponse(null);
      setQueryText('');
      window.showToast('Conversation deleted.', 'success');
    } catch (err) {
      console.error(err);
      window.showToast(err.message || 'Failed to delete.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={styles.container}>
      <p style={{ color: '#8e95b3', textAlign: 'center', paddingTop: '3rem' }}>Loading…</p>
    </div>
  );

  return (
    <div className={styles.container}>
      <style>{`
        @keyframes fadeInScale {
          from { opacity:0; transform:scale(0.96) translateY(8px); }
          to   { opacity:1; transform:scale(1)    translateY(0); }
        }
        .chat-scroll::-webkit-scrollbar { width:4px; }
        .chat-scroll::-webkit-scrollbar-track { background:transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:4px; }
      `}</style>

      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {selectedClassroom && classrooms.length > 1 && (
            <button onClick={() => { setSelectedClassroom(null); setResponse(null); }} style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem', padding: '0.35rem', cursor: 'pointer', color: '#94a3b8',
              display: 'flex', alignItems: 'center'
            }}>
              <ArrowLeft size={16} />
            </button>
          )}
          <MessageSquare size={20} color="#818cf8" />
          <h2 className={styles.title} style={{ fontSize: '1.1rem', margin: 0 }}>
            {selectedClassroom ? `Chat · ${selectedClassroom.name}` : 'General Q&A'}
          </h2>
        </div>
        <span className={styles.badge} style={{ backgroundColor: 'rgba(92,103,255,0.15)', color: '#818cf8' }}>ASK</span>
      </div>

      {/* Card */}
      <div className={styles.pollCard} style={{ padding: '1.75rem' }}>

        {/* ── No classrooms ── */}
        {classrooms.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#475569' }}>
            <Users size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>You are not enrolled in any classroom yet.</p>
          </div>
        )}

        {/* ── Staff Selection (multiple classrooms, none selected) ── */}
        {classrooms.length > 1 && !selectedClassroom && (
          <StaffSelectionScreen
            classrooms={classrooms}
            responses={allResponses}
            onSelect={handleSelectClassroom}
          />
        )}

        {/* ── Chat View ── */}
        {selectedClassroom && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeInScale 0.25s ease' }}>

            {/* Instructor info strip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: '0.75rem',
              background: 'rgba(92,103,255,0.06)', border: '1px solid rgba(92,103,255,0.15)'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg,#5c67ff,#7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, color: 'white', fontSize: '0.9rem'
              }}>
                {selectedClassroom.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: 'white', fontSize: '0.875rem' }}>
                  {selectedClassroom.name}
                </p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>Your Instructor</p>
              </div>
              {/* Delete button (top right of strip) */}
              {response && (
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={isSubmitting}
                  title="Delete this conversation"
                  style={{
                    marginLeft: 'auto', padding: '0.35rem 0.75rem', borderRadius: '2rem',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    color: '#f87171', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '0.35rem'
                  }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>

            {/* Messages */}
            {response ? (
              <div
                className="chat-scroll"
                style={{
                  display: 'flex', flexDirection: 'column', gap: '0.65rem',
                  maxHeight: '280px', overflowY: 'auto', padding: '0.25rem 0'
                }}
              >
                {(response.messages && response.messages.length > 0)
                  ? response.messages.map((msg, idx) => {
                      const isMe = msg.sender === 'student';
                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '80%', padding: '0.6rem 0.9rem',
                            borderRadius: isMe ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                            background: isMe
                              ? 'linear-gradient(135deg,#5c67ff,#7c3aed)'
                              : 'rgba(255,255,255,0.06)',
                            color: 'white',
                            border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}>
                            <p style={{
                              fontSize: '0.62rem', margin: '0 0 0.2rem', fontWeight: 700,
                              opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.04em'
                            }}>
                              {isMe ? 'You' : 'Instructor'}
                            </p>
                            <p style={{ fontSize: '0.875rem', margin: 0, lineHeight: 1.45 }}>{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  : response.query && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{
                          maxWidth: '80%', padding: '0.6rem 0.9rem',
                          borderRadius: '1rem 1rem 0 1rem',
                          background: 'linear-gradient(135deg,#5c67ff,#7c3aed)',
                          color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}>
                          <p style={{ fontSize: '0.62rem', margin: '0 0 0.2rem', fontWeight: 700, opacity: 0.65, textTransform: 'uppercase' }}>You</p>
                          <p style={{ fontSize: '0.875rem', margin: 0 }}>{response.query}</p>
                        </div>
                      </div>
                    )
                }
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '2rem', color: '#475569',
                border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '0.75rem'
              }}>
                <MessageSquare size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No messages yet. Say hello! 👋</p>
              </div>
            )}

            {/* Input */}
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-end' }}>
              <textarea
                placeholder={`Message ${selectedClassroom.name}… (Enter to send)`}
                value={queryText}
                onChange={e => setQueryText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                rows={2}
                style={{
                  flex: 1, padding: '0.65rem 0.9rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(30,41,59,0.4)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'white', fontFamily: 'inherit', fontSize: '0.9rem',
                  resize: 'none', outline: 'none', lineHeight: 1.5, transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#5c67ff'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              <button
                onClick={handleSend}
                disabled={isSubmitting || !queryText.trim()}
                style={{
                  width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                  background: queryText.trim()
                    ? 'linear-gradient(135deg,#5c67ff,#7c3aed)'
                    : 'rgba(255,255,255,0.06)',
                  border: 'none', cursor: queryText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: queryText.trim() ? '0 4px 16px rgba(92,103,255,0.35)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <Send size={16} color={queryText.trim() ? 'white' : '#475569'} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modern Confirm Modal */}
      <ConfirmModal
        isOpen={confirmOpen}
        title="Delete Conversation"
        message={`Are you sure you want to delete your entire conversation with ${selectedClassroom?.name}? This cannot be undone.`}
        confirmLabel="Yes, Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
