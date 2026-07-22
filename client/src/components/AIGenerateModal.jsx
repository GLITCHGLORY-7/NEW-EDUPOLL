import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { generateAiPoll, getClassrooms } from '../services/api';
import styles from './CreatePollModal.module.css';

export default function AIGenerateModal({ isOpen, onClose, onSuccess, initialClassroomId }) {
  const [topic, setTopic] = useState('');
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTopic('');
      setLoading(false);
      getClassrooms().then(data => {
        setClassrooms(data);
        if (initialClassroomId && initialClassroomId !== 'all') {
          setSelectedClassroom(initialClassroomId);
        } else if (data.length > 0) {
          setSelectedClassroom(data[0].id);
        }
      }).catch(console.error);
    }
  }, [isOpen, initialClassroomId]);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic || !selectedClassroom) return;

    setLoading(true);
    try {
      await generateAiPoll(topic, selectedClassroom);
      window.showToast("Gemini AI successfully generated and published the poll!", "success");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      window.showToast("Failed to generate poll using Gemini AI.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <form className={styles.modal} onSubmit={handleGenerate} style={{ maxWidth: '460px' }}>
        <div className={styles.header}>
          <h2 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: '#ec4899' }} /> Generate Activity with Gemini AI
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        <div className={styles.body} style={{ gap: '1.25rem' }}>
          <div className={styles.formGroup}>
            <label>Select Target Classroom *</label>
            <select 
              className={styles.input} 
              value={selectedClassroom} 
              onChange={e => setSelectedClassroom(e.target.value)}
              required
            >
               {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Topic / Concept *</label>
            <input 
              type="text" 
              placeholder="e.g. Asynchronous Javascript, React Hooks" 
              className={styles.input} 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              required
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            backgroundColor: '#1a1e2d',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '1.25rem' }}>🤖</span>
            <p style={{ color: '#8e95b3', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>
              Gemini will automatically generate a title and detailed response prompt for your classroom poll.
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" className={styles.createBtn} disabled={loading} style={{
            background: 'linear-gradient(135deg, #5c67ff, #ec4899)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {loading ? "Generating..." : "Generate"} <Sparkles size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
