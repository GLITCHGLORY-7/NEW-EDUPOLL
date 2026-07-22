import { useState, useEffect } from 'react';
import { getPollsResponsesSummary } from '../services/api';
import PollDetailsModal from '../components/PollDetailsModal';
import styles from './Results.module.css';

export default function Results() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPollId, setSelectedPollId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = (pollId) => {
    setSelectedPollId(pollId);
    setIsModalOpen(true);
  };

  useEffect(() => {
    getPollsResponsesSummary()
      .then(data => {
        setSummaries(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      const options = { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      };
      // Format to: May 18, 2024 09:00 AM
      return date.toLocaleString('en-US', options).replace(',', '');
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Responses</h2>
        <p className={styles.subtitle}>{summaries.length} total polls tracked</p>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div style={{ padding: '2rem', color: '#8e95b3', textAlign: 'center' }}>Loading summaries...</div>
        ) : summaries.length === 0 ? (
          <div style={{ padding: '3rem', color: '#8e95b3', textAlign: 'center' }}>
            <h3>No responses tracked yet</h3>
            <p>Responses will show up here once students start voting.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Poll Question</th>
                  <th>Classroom</th>
                  <th>Status</th>
                  <th>Responses</th>
                  <th>Not Answered</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map(item => (
                  <tr key={item.id}>
                    <td className={styles.questionCell}>{item.question}</td>
                    <td className={styles.classroomCell}>{item.classroomName}</td>
                    <td className={styles.statusCell}>
                      <span className={`${styles.statusBadge} ${item.status === 'live' ? styles.live : styles.closed}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className={styles.numberCell}>{item.responsesCount} / {item.totalStudents}</td>
                    <td className={styles.numberCell} style={{ color: '#ef4444' }}>{item.notAnswered}</td>
                    <td className={styles.dateCell}>{formatDate(item.createdAt)}</td>
                    <td>
                      <button 
                        onClick={() => handleViewDetails(item.id)}
                        style={{
                          background: 'rgba(92, 103, 255, 0.1)',
                          color: '#5c67ff',
                          border: '1px solid rgba(92, 103, 255, 0.2)',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PollDetailsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        pollId={selectedPollId} 
      />
    </div>
  );
}
