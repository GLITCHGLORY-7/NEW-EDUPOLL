import { useState, useEffect } from 'react';
import { QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getClassrooms, getStaffPolls } from '../services/api';
import styles from './QRLinks.module.css';

export default function QRLinks() {
  const [activities, setActivities] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomForQR, setSelectedClassroomForQR] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedPollId, setCopiedPollId] = useState('');

  const handleCopy = (url, pollId) => {
    navigator.clipboard.writeText(url);
    setCopiedPollId(pollId);
    setTimeout(() => setCopiedPollId(''), 2000);
  };

  useEffect(() => {
    Promise.all([getClassrooms(), getStaffPolls()]).then(([classroomsData, pollsData]) => {
      setClassrooms(classroomsData);
      setActivities(pollsData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const qrPolls = selectedClassroomForQR 
    ? activities.filter(a => a.classroomId === selectedClassroomForQR)
    : [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Poll QR Codes</h2>
          <p className={styles.subtitle}>View and print QR codes for your active polls.</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.qrHeader}>
           <div className={styles.qrTitleBlock}>
              <QrCode size={18} className={styles.qrIcon} />
              <h3>Poll QR Codes</h3>
           </div>
           <select 
             className={styles.select}
             value={selectedClassroomForQR}
             onChange={e => setSelectedClassroomForQR(e.target.value)}
           >
             <option value="">Select Classroom</option>
             {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
           </select>
        </div>

        <div className={styles.qrBody}>
           {!selectedClassroomForQR ? (
             <p className={styles.qrPlaceholderText}>Select a classroom to view QR codes</p>
           ) : qrPolls.length === 0 ? (
             <p className={styles.qrPlaceholderText}>No active polls in this classroom.</p>
           ) : (
             <div className={styles.qrGrid}>
                {qrPolls.map(poll => {
                  const url = `${window.location.origin}/poll/${poll.id}`;
                  return (
                    <div key={poll.id} className={styles.qrCard}>
                      <h4>{poll.question}</h4>
                      <div className={styles.qrWrapper}>
                         <QRCodeSVG value={url} size={150} />
                      </div>
                      <p className={styles.qrLink}>{url}</p>
                      <button 
                        className={styles.copyBtn} 
                        onClick={() => handleCopy(url, poll.id)}
                      >
                        {copiedPollId === poll.id ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  );
                })}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
