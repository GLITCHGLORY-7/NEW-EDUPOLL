import { useState, useEffect } from 'react';
import { Waves } from 'lucide-react';
import { getStudentAllPolls, getStudentResponses } from '../services/api';
import { PollItem } from './StudentActivePoll';
import styles from './StudentActivePoll.module.css';

export default function StudentMyPolls() {
  const [polls, setPolls] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pollsData, respData] = await Promise.all([
          getStudentAllPolls(),
          getStudentResponses()
        ]);
        setPolls((pollsData || []).sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0)));
        
        const respMap = {};
        (respData || []).forEach(r => {
          respMap[r.pollId] = r;
        });
        setResponses(respMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>My Classroom Polls</h2>
      </div>

      {loading ? (
        <div className={styles.pollCard}><p>Loading polls...</p></div>
      ) : polls.length === 0 ? (
        <div className={styles.pollCard} style={{ alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
          <Waves size={32} style={{ color: '#5c67ff', marginBottom: '0.5rem', opacity: 0.5 }} />
          <p style={{ color: '#8e95b3' }}>No polls created for your class yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {polls.map(p => {
            if (p.status === 'live') {
              return (
                <PollItem 
                  key={p.id} 
                  poll={p} 
                  initialResponse={responses[p.id] || null} 
                />
              );
            }
            return (
              <div key={p.id} className={styles.pollCard} style={{ gap: '0.5rem', opacity: 0.75 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ color: 'white', margin: 0, fontSize: '1.1rem' }}>{p.question}</h4>
                  <span className={styles.badge} style={{ 
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    margin: 0
                  }}>
                    Closed
                  </span>
                </div>
                <p style={{ color: '#8e95b3', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>
                  Options: {(p.options || []).join(', ')}
                </p>
                {responses[p.id] && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <p style={{ color: '#10b981', fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>
                      ✓ Your Recorded Response: <span style={{ textDecoration: 'underline' }}>{responses[p.id].answer}</span>
                    </p>
                    {responses[p.id].query && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                        <span style={{ fontWeight: 500 }}>Your Query:</span> "{responses[p.id].query}"
                      </p>
                    )}
                    {responses[p.id].staffReply && (
                      <p style={{ color: '#818cf8', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
                        ★ Staff Reply: "{responses[p.id].staffReply}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
