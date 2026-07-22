import { Fragment, useState } from 'react';
import { Trash2, Search, Send, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { replyToStudentQuery } from '../services/api';
import styles from './StudentListWidget.module.css';

function InlineReplyBox({ pollId, studentId, onReplySuccess, onDeleteQuery }) {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const handleSend = async () => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      await replyToStudentQuery(pollId, studentId, replyText);
      onReplySuccess(replyText);
      setReplyText('');
      setShowInput(false);
      window.showToast("Reply sent successfully!", "success");
    } catch (err) {
      console.error(err);
      window.showToast("Failed to send reply.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showInput) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowInput(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'linear-gradient(135deg, rgba(92,103,255,0.15), rgba(92,103,255,0.05))',
            border: '1px solid rgba(92,103,255,0.3)',
            color: '#818cf8',
            fontSize: '0.75rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '2rem',
            cursor: 'pointer',
            fontWeight: 700,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(92,103,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
        >
          <Send size={11} /> Reply
        </button>
        {onDeleteQuery && (
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this student\'s query?')) {
                onDeleteQuery();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171',
              fontSize: '0.75rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '2rem',
              cursor: 'pointer',
              fontWeight: 700,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.18)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}
          >
            <Trash2 size={11} /> Delete
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="text"
        placeholder="Type reply..."
        value={replyText}
        onChange={e => setReplyText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
          if (e.key === 'Escape') setShowInput(false);
        }}
        autoFocus
        disabled={isSubmitting}
        style={{
          padding: '0.35rem 0.65rem',
          borderRadius: '2rem',
          backgroundColor: 'var(--bg-main)',
          border: '1px solid rgba(92,103,255,0.4)',
          color: 'var(--text-main)',
          fontSize: '0.8rem',
          outline: 'none',
          width: '220px',
        }}
      />
      <button
        onClick={handleSend}
        disabled={isSubmitting || !replyText.trim()}
        style={{
          background: 'linear-gradient(135deg, #5c67ff, #818cf8)',
          color: 'white',
          border: 'none',
          fontSize: '0.75rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '2rem',
          cursor: replyText.trim() ? 'pointer' : 'not-allowed',
          fontWeight: 700,
          opacity: replyText.trim() ? 1 : 0.5,
        }}
      >
        {isSubmitting ? '...' : 'Send'}
      </button>
      <button
        onClick={() => setShowInput(false)}
        disabled={isSubmitting}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  );
}

export default function StudentListWidget({ title, count, students, type, onDeleteResponse, onReplySuccess }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});

  const filteredStudents = (students || []).filter(s =>
    (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
    (s.id && s.id.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleExpand = (idx) => setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));

  const formatTime = (timeStr) => {
    try {
      const d = new Date(timeStr);
      if (isNaN(d)) return timeStr;
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch { return timeStr; }
  };

  return (
    <div className={styles.widget}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>{title} ({count})</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '0.35rem 0.6rem 0.35rem 2rem',
                borderRadius: '2rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                width: '200px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#5c67ff'}
              onBlur={e => e.target.style.borderColor = ''}
            />
          </div>
        </div>
      </div>

      {/* Student Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.5rem 0' }}>
        {filteredStudents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            <Search size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
            <p style={{ margin: 0 }}>No students found</p>
          </div>
        )}

        {filteredStudents.map((student, i) => {
          const isOpen = !!expanded[i];
          const hasConversation = student.query || (student.messages && student.messages.length > 0);

          return (
            <div
              key={i}
              style={{
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Student Row */}
              <div
                onClick={() => hasConversation && toggleExpand(i)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr auto auto',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.85rem 1.25rem',
                  cursor: hasConversation ? 'pointer' : 'default',
                  userSelect: 'none',
                }}
              >
                {/* ID Badge */}
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: '#818cf8',
                  fontWeight: 700,
                  backgroundColor: 'rgba(92,103,255,0.08)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem',
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {student.id}
                </span>

                {/* Name + Status */}
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>{student.name}</p>
                  {student.time && (
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatTime(student.time)}</p>
                  )}
                </div>

                {/* Status Badge */}
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '2rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  backgroundColor: type === 'answered' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                  color: type === 'answered' ? '#10b981' : 'var(--text-muted)',
                  border: `1px solid ${type === 'answered' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                  {student.status || (type === 'answered' ? 'Answered' : 'Pending')}
                </span>

                {/* Expand arrow */}
                {hasConversation && (
                  <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                )}
              </div>

              {/* Expanded Conversation */}
              {isOpen && hasConversation && (
                <div style={{
                  borderTop: '1px solid var(--border-color)',
                  padding: '1rem 1.25rem 1.25rem',
                  background: 'rgba(0,0,0,0.15)',
                }}>
                  {/* Messages */}
                  {student.messages && student.messages.length > 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      marginBottom: '1rem',
                      paddingRight: '0.25rem',
                    }}>
                      {student.messages.map((msg, idx) => {
                        const isStaff = msg.sender === 'staff';
                        return (
                          <div key={idx} style={{ display: 'flex', justifyContent: isStaff ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                              maxWidth: '80%',
                              padding: '0.6rem 0.9rem',
                              borderRadius: isStaff ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                              background: isStaff
                                ? 'linear-gradient(135deg, #5c67ff, #7c3aed)'
                                : 'rgba(255,255,255,0.07)',
                              color: 'white',
                              border: isStaff ? 'none' : '1px solid rgba(255,255,255,0.08)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            }}>
                              <p style={{ fontSize: '0.62rem', margin: '0 0 0.2rem', fontWeight: 700, opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {isStaff ? 'You' : student.name}
                              </p>
                              <p style={{ fontSize: '0.875rem', margin: 0, lineHeight: 1.45 }}>{msg.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : student.query ? (
                    <div style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '0.75rem',
                      padding: '0.75rem 1rem',
                      marginBottom: '1rem',
                    }}>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '0 0 0.3rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        <MessageSquare size={11} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
                        Student Query
                      </p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0, fontWeight: 500 }}>"{student.query}"</p>
                      {student.staffReply && (
                        <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ fontSize: '0.65rem', color: '#10b981', margin: '0 0 0.3rem', fontWeight: 700, textTransform: 'uppercase' }}>✓ Your Reply</p>
                          <p style={{ fontSize: '0.9rem', color: '#a5b4fc', margin: 0, fontStyle: 'italic' }}>"{student.staffReply}"</p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Actions */}
                  <InlineReplyBox
                    pollId={student.pollId}
                    studentId={student.id}
                    onReplySuccess={() => { if (onReplySuccess) onReplySuccess(); }}
                    onDeleteQuery={onDeleteResponse ? () => onDeleteResponse(student) : null}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.showingText}>Showing {filteredStudents.length} of {count}</span>
      </div>
    </div>
  );
}
