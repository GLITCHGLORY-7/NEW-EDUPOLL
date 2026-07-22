import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, RefreshCw, Send, Trash2 } from 'lucide-react';
import { getCurrentUser, getClassrooms, getPollResults, getStudents, sendMessageToStudent, deleteStudentResponse } from '../services/api';
import StudentListWidget from '../components/StudentListWidget';

export default function StaffGeneralQuery() {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const navigate = useNavigate();

  const loadClassrooms = async () => {
    try {
      const user = getCurrentUser();
      if (!user || user.role !== 'staff') {
        navigate('/login');
        return;
      }
      
      const cls = await getClassrooms();
      if (Array.isArray(cls)) {
        setClassrooms(cls);
        if (cls.length > 0) {
          const urlParams = new URLSearchParams(window.location.search);
          const initialClassroomId = urlParams.get('classroomId');
          
          if (initialClassroomId && cls.some(c => c.id === initialClassroomId)) {
            setSelectedClassroomId(initialClassroomId);
          } else {
            setSelectedClassroomId(cls[0].id);
          }
        }
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      loading && setLoading(false);
    }
  };

  const loadGeneralResults = async (classId) => {
    if (!classId) return;
    setRefreshing(true);
    try {
      const currentPollId = `GENERAL_${classId}`;
      const data = await getPollResults(currentPollId, classId);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const location = useLocation();

  useEffect(() => {
    loadClassrooms();
  }, [location.search]);

  useEffect(() => {
    if (selectedClassroomId) {
      loadGeneralResults(selectedClassroomId);
      
      getStudents().then(data => {
        setClassroomStudents(data.filter(s => s.classroomId === selectedClassroomId));
      }).catch(console.error);
    } else {
      setResults(null);
      setClassroomStudents([]);
    }
  }, [selectedClassroomId]);

  const handleSendMessage = async () => {
    if (!targetStudentId || !messageBody.trim()) {
      window.showToast("Please select a student and type a message.", "error");
      return;
    }
    setSendingMessage(true);
    try {
      await sendMessageToStudent(targetStudentId, messageBody);
      window.showToast("Message sent to student!", "success");
      setMessageBody('');
      setIsMessageModalOpen(false);
      loadGeneralResults(selectedClassroomId);
    } catch (err) {
      console.error(err);
      window.showToast("Failed to send message.", "error");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading General Queries...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>General Classroom Queries</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>
            View and respond to general questions and messages submitted by students.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {selectedClassroomId && (
            <button 
              onClick={() => setClearAllConfirmOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
            >
              <span>Clear All</span>
            </button>
          )}
          {selectedClassroomId && classroomStudents.length > 0 && (
            <button 
              onClick={() => {
                setTargetStudentId('');
                setMessageBody('');
                setIsMessageModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#5c67ff',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
            >
              <Send size={16} />
              <span>Message Student</span>
            </button>
          )}
          <button 
            onClick={() => loadGeneralResults(selectedClassroomId)}
            disabled={refreshing || !selectedClassroomId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              cursor: selectedClassroomId ? 'pointer' : 'not-allowed',
              fontSize: '0.85rem'
            }}
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Select Classroom:</span>
        <select 
          value={selectedClassroomId || ''} 
          onChange={(e) => setSelectedClassroomId(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '0.25rem', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
        >
          {classrooms.map(c => (
            <option key={c.id} value={c.id} style={{ background: '#1e293b', color: '#f8fafc' }}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {classrooms.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <MessageSquare size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
          <h3>No Classrooms Found</h3>
          <p>Create a classroom first to start receiving general queries.</p>
        </div>
      ) : (
        <div style={{ maxWidth: '800px' }}>
          <StudentListWidget 
            title="General Queries Received" 
            count={results?.answered?.length || 0} 
            students={(results?.answered || []).map(s => ({ ...s, pollId: s.pollId || `GENERAL_${selectedClassroomId}` }))}
            type="answered" 
            onReplySuccess={() => loadGeneralResults(selectedClassroomId)}
            onDeleteResponse={async (student) => {
              try {
                await deleteStudentResponse(student.pollId || `GENERAL_${selectedClassroomId}`, student.id);
                window.showToast('Query deleted.', 'success');
                loadGeneralResults(selectedClassroomId);
              } catch (e) {
                console.error(e);
                window.showToast('Failed to delete query.', 'error');
              }
            }}
          />
        </div>
      )}

      {isMessageModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', borderRadius: '0.5rem' }}>
            <h3 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Send Message to Student</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Select Student</label>
              <select 
                value={targetStudentId}
                onChange={e => setTargetStudentId(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '0.25rem', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
              >
                <option value="">-- Choose Student --</option>
                {classroomStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Message</label>
              <textarea 
                placeholder="Type your message here..."
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.25rem',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setIsMessageModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-muted)',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSendMessage}
                disabled={sendingMessage || !targetStudentId || !messageBody.trim()}
                style={{
                  backgroundColor: '#5c67ff',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.25rem',
                  cursor: (targetStudentId && messageBody.trim()) ? 'pointer' : 'not-allowed',
                  opacity: (targetStudentId && messageBody.trim()) ? 1 : 0.5,
                  fontWeight: 700,
                  fontSize: '0.95rem'
                }}
              >
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modern Clear All Confirm Modal ── */}
      {clearAllConfirmOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1e2a3a, #151f2e)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '400px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Trash2 size={18} color="#ef4444" />
              </div>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1rem', fontWeight: 700 }}>Clear All Queries</h3>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              Are you sure you want to permanently delete <strong style={{ color: 'white' }}>all general queries</strong> for this classroom? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setClearAllConfirmOpen(false)}
                style={{
                  padding: '0.55rem 1.25rem', borderRadius: '0.5rem',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600
                }}
              >Cancel</button>
              <button
                onClick={async () => {
                  setClearAllConfirmOpen(false);
                  try {
                    setRefreshing(true);
                    const { clearAllResponsesForPoll } = await import('../services/api.js');
                    await clearAllResponsesForPoll(`GENERAL_${selectedClassroomId}`);
                    window.showToast('All queries deleted.', 'success');
                    loadGeneralResults(selectedClassroomId);
                  } catch (e) {
                    console.error(e);
                    window.showToast('Failed to delete queries.', 'error');
                    setRefreshing(false);
                  }
                }}
                style={{
                  padding: '0.55rem 1.25rem', borderRadius: '0.5rem',
                  background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                  border: 'none', color: 'white', cursor: 'pointer',
                  fontSize: '0.875rem', fontWeight: 700,
                  boxShadow: '0 4px 16px rgba(239,68,68,0.3)'
                }}
              >Yes, Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
