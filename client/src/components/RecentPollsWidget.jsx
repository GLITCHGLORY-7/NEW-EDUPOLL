import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import styles from './RecentPollsWidget.module.css';

export default function RecentPollsWidget({ pollsSummary = [] }) {
  const navigate = useNavigate();
  const sortedPolls = [...pollsSummary].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recent Polls</h3>
        <button className={styles.createBtn} onClick={() => navigate('/polls')}>+ Create New Poll</button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Poll Question</th>
              <th>Classroom</th>
              <th>Status</th>
              <th>Responses</th>
              <th>Not Answered</th>
              <th>Created At</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPolls.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '2rem'}}>No recent polls found.</td></tr>
            ) : sortedPolls.map((poll) => (
              <tr key={poll.id}>
                <td className={styles.questionCol}>{poll.question}</td>
                <td>{poll.classroomName}</td>
                <td>
                  <span className={`${styles.statusBadge} ${poll.status === 'live' ? styles.live : styles.closed}`}>
                    {poll.status.charAt(0).toUpperCase() + poll.status.slice(1)}
                  </span>
                </td>
                <td>{poll.responsesCount} / {poll.totalStudents}</td>
                <td>{poll.notAnswered}</td>
                <td className={styles.time}>{new Date(poll.createdAt).toLocaleString()}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => navigate('/polls', { state: { editPollId: poll.id } })}
                    style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'inline-flex', padding: '4px' }}
                    title="Edit Poll"
                  >
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
