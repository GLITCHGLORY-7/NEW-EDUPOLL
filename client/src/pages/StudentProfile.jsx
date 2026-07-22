import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { getCurrentUser, logout, getStudentProfile } from '../services/api';
import styles from './StudentActivePoll.module.css';

export default function StudentProfile() {
  const [profile, setProfile] = useState(getCurrentUser());
  const navigate = useNavigate();

  useEffect(() => {
    getStudentProfile()
      .then(data => {
        setProfile(data);
        localStorage.setItem('user', JSON.stringify(data));
      })
      .catch(console.error);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!profile) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Student Profile</h2>
      </div>

      <div className={styles.pollCard} style={{ gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '9999px',
            backgroundColor: 'var(--primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: '700'
          }}>
            {profile.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
          </div>
          <div>
            <h3 style={{ color: 'var(--text-main)', margin: 0 }}>{profile.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{profile.id}</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Department</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{profile.department || 'Not Specified'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Year</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{profile.year || 'Not Specified'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Section</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{profile.section || 'Not Specified'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Gender</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{profile.gender || 'Not Specified'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Classroom</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{profile.classroomName || profile.classroomId || 'Not Assigned'}</span>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '1rem',
            width: '100%',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
