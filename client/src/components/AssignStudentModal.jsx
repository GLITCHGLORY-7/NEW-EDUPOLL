import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { getStudents, updateStudent, getClassrooms } from '../services/api';
import styles from './CreatePollModal.module.css';

export default function AssignStudentModal({ isOpen, onClose, onSuccess, classroomId, classroomName }) {
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      Promise.all([getStudents(), getClassrooms()]).then(([studentsData, classroomsData]) => {
        setStudents(studentsData);
        setClassrooms(classroomsData);
        setLoading(false);
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAssign = async (studentId) => {
    try {
      await updateStudent(studentId, { classroomId });
      window.showToast("Student assigned to classroom successfully!", "success");
      const data = await getStudents();
      setStudents(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      window.showToast("Failed to assign student.", "error");
    }
  };

  const handleUnassign = async (studentId) => {
    try {
      await updateStudent(studentId, { classroomId: '' });
      window.showToast("Student removed from classroom.", "success");
      const data = await getStudents();
      setStudents(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      window.showToast("Failed to unassign student.", "error");
    }
  };

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: '500px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>Assign to: {classroomName}</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.body} style={{ maxHeight: '400px', overflowY: 'auto', gap: '1rem' }}>
          <div className={styles.formGroup} style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search students..." 
              className={styles.input} 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: '#575e7a' }} />
          </div>

          {loading ? (
            <p style={{ color: '#8e95b3', textAlign: 'center' }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: '#8e95b3', textAlign: 'center' }}>No students found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filtered.map(s => {
                const isCurrentClass = s.classroomId === classroomId;
                const studentClass = classrooms.find(c => c.id === s.classroomId);
                const initials = s.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

                return (
                  <div 
                    key={s.id} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#1a1f2e',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(255,255,255,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '9999px',
                        backgroundColor: '#5c67ff',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        {initials}
                      </div>
                      <div>
                        <h4 style={{ color: 'white', margin: 0, textTransform: 'uppercase', fontSize: '0.85rem' }}>{s.name}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                          <span style={{ color: '#8e95b3', fontSize: '0.75rem' }}>{s.id}</span>
                          {studentClass && (
                            <span style={{ color: '#f59e0b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                              📍 {studentClass.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => isCurrentClass ? handleUnassign(s.id) : handleAssign(s.id)}
                      className={styles.createBtn}
                      style={{
                        padding: '0.35rem 1rem',
                        fontSize: '0.8rem',
                        backgroundColor: isCurrentClass ? 'transparent' : '#5c67ff',
                        color: isCurrentClass ? '#ef4444' : 'white',
                        border: isCurrentClass ? '1px solid #ef4444' : 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {isCurrentClass ? "Unassign" : "Assign"}
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
