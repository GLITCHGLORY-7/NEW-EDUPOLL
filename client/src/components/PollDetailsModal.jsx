import { useState, useEffect } from 'react';
import { X, Users, CheckCircle, Clock } from 'lucide-react';
import { getPollResults } from '../services/api';
import StudentListWidget from './StudentListWidget';
import styles from './CreatePollModal.module.css';

export default function PollDetailsModal({ isOpen, onClose, pollId }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = () => {
    if (isOpen && pollId) {
      setLoading(true);
      getPollResults(pollId)
        .then(data => {
          setResults(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setResults(null);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [isOpen, pollId]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} style={{ zIndex: 9999 }}>
      <div className={styles.modal} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--surface)', border: '1px solid var(--border-color)', zIndex: 10000 }}>
        <div className={styles.header}>
          <h2 className={styles.title}>Poll Details</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.form} style={{ padding: '1.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
              Loading student details...
            </div>
          ) : results ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', background: 'var(--input-bg)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 500 }}>{results.poll.question}</p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <CheckCircle size={24} style={{ color: '#34d399' }} />
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{results.answered.length}</div>
                    <div style={{ color: '#34d399', fontSize: '0.85rem' }}>Answered</div>
                  </div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(251, 191, 36, 0.2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Clock size={24} style={{ color: '#fbbf24' }} />
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{results.notAnswered.length}</div>
                    <div style={{ color: '#fbbf24', fontSize: '0.85rem' }}>Pending</div>
                  </div>
                </div>
                <div style={{ padding: '1rem', background: 'rgba(129, 140, 248, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(129, 140, 248, 0.2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Users size={24} style={{ color: '#818cf8' }} />
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{results.totalStudents}</div>
                    <div style={{ color: '#818cf8', fontSize: '0.85rem' }}>Total Students</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1rem' }}>
                <StudentListWidget 
                  title="Students Who Answered" 
                  count={results.answered.length} 
                  students={results.answered} 
                  type="answered"
                  onReplySuccess={fetchResults}
                />
                <StudentListWidget 
                  title="Students Not Answered" 
                  count={results.notAnswered.length} 
                  students={results.notAnswered} 
                  type="notAnswered" 
                />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#ef4444', padding: '3rem' }}>
              Failed to load poll data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
