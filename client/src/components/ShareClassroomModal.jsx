import { useState } from 'react';
import { X, Copy, QrCode } from 'lucide-react';
import styles from './CreatePollModal.module.css';

export default function ShareClassroomModal({ isOpen, classroom, onClose }) {
  if (!isOpen || !classroom) return null;

  const shareLink = `${window.location.origin}/join/${classroom.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    window.showToast("Link copied to clipboard!", "success");
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>Share Classroom: {classroom.name}</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        <div className={styles.modalBody} style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ background: 'white', padding: '1rem', display: 'inline-block', borderRadius: '8px', marginBottom: '1rem' }}>
             <QrCode size={150} color="#000" />
          </div>
          <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>Scan QR code or share the link below. Only assigned students can access the poll.</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <input type="text" value={shareLink} readOnly className={styles.input} style={{ flex: 1 }} />
             <button onClick={handleCopy} className={styles.primaryBtn} style={{ padding: '0 1rem' }}><Copy size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
