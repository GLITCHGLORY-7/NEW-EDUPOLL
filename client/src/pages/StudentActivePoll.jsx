import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Bell, Square, CheckSquare, Search } from 'lucide-react';
import { getStudentActivePolls, getStudentActivePoll, submitPollAnswer, getCurrentUser, getStudentResponses, deleteStudentResponseByPoll } from '../services/api';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import styles from './StudentActivePoll.module.css';

export function PollItem({ poll, initialResponse }) {
  const isMultiple = !!poll.allowMultiple;
  const [selected, setSelected] = useState('');
  const [queryText, setQueryText] = useState('');
  const [localQuery, setLocalQuery] = useState('');
  const [localReply, setLocalReply] = useState('');
  const [localMessages, setLocalMessages] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEditingQuery, setIsEditingQuery] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (initialResponse) {
      if (isMultiple) {
        setSelected(Array.isArray(initialResponse.choice) ? initialResponse.choice : (initialResponse.choice ? [initialResponse.choice] : []));
      } else {
        setSelected(initialResponse.answer);
      }
      setQueryText('');
      setLocalQuery(initialResponse.query || '');
      setLocalReply(initialResponse.staffReply || '');
      setLocalMessages(initialResponse.messages || []);
      setIsSuccess(true);
      
      if (initialResponse.messages && initialResponse.messages.length > 0) {
        const lastMsg = initialResponse.messages[initialResponse.messages.length - 1];
        if (lastMsg.sender === 'staff') {
          localStorage.setItem(`read_msg_${initialResponse.id}_${initialResponse.messages.length}`, 'true');
        }
      }
    } else {
      setSelected(isMultiple ? [] : '');
      setLocalMessages([]);
    }
  }, [initialResponse, poll, isMultiple]);

  const isAnySelected = isMultiple
    ? (Array.isArray(selected) && selected.length > 0)
    : !!selected;

  const handleToggleOption = (option) => {
    if (isMultiple) {
      const arr = Array.isArray(selected) ? selected : [];
      if (arr.includes(option)) {
        setSelected(arr.filter(o => o !== option));
      } else {
        setSelected([...arr, option]);
      }
    } else {
      setSelected(option);
    }
  };

  const handleSubmit = async () => {
    if (!isAnySelected) return;
    try {
      const res = await submitPollAnswer(poll.id, selected, queryText);
      setIsSuccess(true);
      if (res.response) {
        setLocalQuery(res.response.query || '');
        setLocalReply(res.response.staffReply || '');
        setLocalMessages(res.response.messages || []);
      }
      setQueryText('');
      setError('');
      setIsEditingQuery(false);
      window.showToast("Answer submitted successfully!", "success");
    } catch (err) {
      setError(err.message || 'Failed to submit answer.');
    }
  };

  const handleSendQueryOnly = async () => {
    if (!isAnySelected) {
      window.showToast("Please submit your poll answer first.", "error");
      return;
    }
    try {
      const res = await submitPollAnswer(poll.id, selected, queryText);
      if (res.response) {
        setLocalQuery(res.response.query || '');
        setLocalReply(res.response.staffReply || '');
        setLocalMessages(res.response.messages || []);
      }
      setQueryText('');
      setIsEditingQuery(false);
      window.showToast("Query sent to instructor!", "success");
    } catch (err) {
      window.showToast("Failed to submit query.", "error");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQueryOnly();
    }
  };

  const handleClearAnswer = async () => {
    if (!window.confirm("Are you sure you want to clear your response? This will completely withdraw your vote.")) return;
    try {
      await deleteStudentResponseByPoll(poll.id);
      setIsSuccess(false);
      setSelected(isMultiple ? [] : '');
      setLocalQuery('');
      setLocalReply('');
      setLocalMessages([]);
      setError('');
      if (window.showToast) window.showToast("Your response has been cleared!", "success");
    } catch(err) {
      console.error(err);
      if (window.showToast) window.showToast("Failed to clear response.", "error");
    }
  };

  const hasAnswered = !!initialResponse || isSuccess;
  const hasReply = !!initialResponse?.staffReply;

  return (
    <div className={styles.pollCard} style={{ padding: isExpanded ? '2rem' : '1.25rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 
          className={styles.question} 
          style={{ margin: 0, fontSize: '1.1rem', cursor: 'pointer', flex: 1 }} 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {poll.question}
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginLeft: '1rem' }}>
          {/* Notification bell inside the right corner */}
          {hasReply && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: '#10b981',
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}
              title="Staff replied to your query"
            >
              <Bell size={12} fill="#10b981" />
              <span>Reply</span>
            </div>
          )}
          <span className={styles.badge} style={{ 
            backgroundColor: hasAnswered ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: hasAnswered ? '#10b981' : '#f59e0b',
            margin: 0
          }}>
            {hasAnswered ? 'Answered' : 'Pending'}
          </span>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              padding: '0.25rem 0.75rem',
              borderRadius: '0.25rem',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
          
           {/* Poll Choices / Answer section */}
          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '1rem 0 1.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Response Recorded!</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                 Your choice: <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                  "{isMultiple ? (Array.isArray(selected) ? selected.join(', ') : '') : selected}"
                </span> has been submitted.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                   className={styles.updateBtn} 
                   onClick={() => setIsSuccess(false)}
                >
                   Update Choice
                </button>
                <button 
                   className={styles.clearBtn} 
                   onClick={handleClearAnswer}
                   style={{
                     backgroundColor: 'rgba(239, 68, 68, 0.15)',
                     color: '#ef4444',
                     border: '1px solid rgba(239, 68, 68, 0.2)',
                     padding: '0.5rem 1.5rem',
                     borderRadius: '0.375rem',
                     fontWeight: 600,
                     cursor: 'pointer',
                     transition: 'all 0.2s'
                   }}
                >
                   Clear Answer
                </button>
              </div>
            </div>
          ) : (
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <p className={styles.subtitle}>
                {isMultiple ? 'Select one or more options below (multiple selection enabled):' : 'Select a single option below:'}
              </p>
              <div className={styles.options}>
                {poll.options.map(option => {
                  const isSelected = isMultiple
                    ? (Array.isArray(selected) && selected.includes(option))
                    : selected === option;
                  return (
                    <div 
                      key={option}
                      className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                      onClick={() => handleToggleOption(option)}
                    >
                      {isMultiple ? (
                        isSelected ? (
                          <CheckSquare className={styles.icon} fill="#5c67ff" color="white" />
                        ) : (
                          <Square className={styles.iconUnselected} />
                        )
                      ) : (
                        isSelected ? (
                          <CheckCircle2 className={styles.icon} fill="#10b981" color="white" />
                        ) : (
                          <Circle className={styles.iconUnselected} />
                        )
                      )}
                      <span>{option}</span>
                    </div>
                  );
                })}
              </div>

              {error && <p className={styles.errorText} style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</p>}

              <button 
                className={`${styles.submitBtn} ${isAnySelected ? styles.active : ''}`}
                onClick={handleSubmit}
                disabled={!isAnySelected}
              >
                Submit Answer
              </button>
            </div>
          )}

          {/* Dedicated Q&A section */}
          <div style={{ marginTop: '0.5rem' }}>
            <h4 style={{ color: 'var(--text-main)', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Instructor Q&A / Feedback</h4>
            
            {hasAnswered && localMessages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem', 
                  padding: '1.25rem', 
                  background: 'var(--surface-hover)', 
                  borderRadius: '0.75rem', 
                  border: '1px solid var(--border-color)',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {localMessages.map((msg, idx) => {
                    const isMe = msg.sender === 'student';
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                          width: '100%'
                        }}
                      >
                        <div style={{
                          maxWidth: '85%',
                          padding: '0.65rem 0.9rem',
                          borderRadius: isMe ? '0.75rem 0.75rem 0 0.75rem' : '0.75rem 0.75rem 0.75rem 0',
                          backgroundColor: isMe ? 'var(--primary)' : 'var(--input-bg)',
                          color: isMe ? 'white' : 'var(--text-main)',
                          border: isMe ? 'none' : '1px solid var(--border-color)',
                          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)'
                        }}>
                          <p style={{ 
                            fontSize: '0.65rem', 
                            margin: '0 0 0.2rem 0', 
                            fontWeight: 700, 
                            color: isMe ? 'rgba(255, 255, 255, 0.7)' : 'var(--primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {isMe ? 'You' : 'Instructor'}
                          </p>
                          <p style={{ fontSize: '0.9rem', margin: 0, lineHeight: '1.4', fontWeight: 500 }}>
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ marginTop: '0.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <textarea 
                    placeholder="Type a follow-up message..."
                    value={queryText}
                    onChange={e => setQueryText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'rgba(30, 41, 59, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'white',
                      fontFamily: 'inherit',
                      fontSize: '0.85rem',
                      resize: 'vertical',
                      outline: 'none',
                      marginBottom: '0.5rem'
                    }}
                  />
                  <button 
                    onClick={handleSendQueryOnly}
                    disabled={!queryText.trim()}
                    style={{
                      backgroundColor: '#5c67ff',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 1rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: queryText.trim() ? 'pointer' : 'not-allowed',
                      opacity: queryText.trim() ? 1 : 0.5
                    }}
                  >
                    Send Reply
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <textarea 
                  placeholder="Have a question or comment about this task? Ask your instructor here..."
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(30, 41, 59, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: 'white',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    outline: 'none',
                    marginBottom: '0.75rem'
                  }}
                  onFocus={e => e.target.style.borderColor = '#5c67ff'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={handleSendQueryOnly}
                    disabled={!queryText.trim()}
                    style={{
                      backgroundColor: '#5c67ff',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: queryText.trim() ? 'pointer' : 'not-allowed',
                      opacity: queryText.trim() ? 1 : 0.5
                    }}
                  >
                    Send Query
                  </button>
                  {isEditingQuery && (
                    <button 
                      onClick={() => {
                        setIsEditingQuery(false);
                        setQueryText('');
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-muted)',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <p className={styles.footerNote}>You can submit and edit your response while live</p>
        </div>
      )}
    </div>
  );
}

export default function StudentActivePoll() {
  const [polls, setPolls] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { id: urlPollId } = useParams();

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = getCurrentUser();
        if (!user || user.role !== 'student') {
          const redirectParam = urlPollId ? `?redirect=/poll/${urlPollId}` : '';
          navigate(`/login${redirectParam}`);
          return;
        }

        // Fetch student responses first
        const respData = await getStudentResponses();
        const respMap = {};
        (respData || []).forEach(r => {
          respMap[r.pollId] = r; // Map the entire response object
        });
        setResponses(respMap);

        if (urlPollId) {
          const data = await getStudentActivePoll(urlPollId);
          setPolls([data]);
          if (!user.classroomId) {
            user.classroomId = data.classroomId;
            localStorage.setItem('user', JSON.stringify(user));
          }
        } else {
          const data = await getStudentActivePolls();
          setPolls((data || []).sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0)));
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(urlPollId ? 'This poll is either closed, does not exist, or you do not have permission to join.' : 'Failed to load active poll.');
        setLoading(false);
      }
    };

    loadData();
  }, [navigate, urlPollId]);

  const filteredPolls = polls.filter(p =>
    !searchQuery || p.question?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className={styles.container}><SkeletonLoader type="card" count={2} /></div>;
  if (error) return <div className={styles.container}><p className={styles.errorText} style={{ color: '#ef4444', textAlign: 'center' }}>{error}</p></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{polls.length > 1 ? 'Active Polls' : 'Active Poll'}</h2>
        <span className={styles.badge}>LIVE</span>
      </div>

      {/* Search bar — only show when there are multiple polls */}
      {polls.length > 1 && (
        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search polls..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '0.65rem 0.875rem 0.65rem 2.25rem',
              background: 'var(--input-bg)', border: '1px solid var(--border-color)',
              borderRadius: '12px', color: 'var(--text-main)', fontSize: '0.875rem',
              outline: 'none', fontFamily: 'inherit'
            }}
          />
        </div>
      )}

      {filteredPolls.length === 0 ? (
        polls.length === 0
          ? <EmptyState icon="🎯" title="No active polls" description="Your teacher hasn't started any polls yet. Check back soon!" />
          : <EmptyState icon="🔍" title="No polls match your search" actionLabel="Clear" onAction={() => setSearchQuery('')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {filteredPolls.map(poll => (
            <PollItem
              key={poll.id}
              poll={poll}
              initialResponse={responses[poll.id] || null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
