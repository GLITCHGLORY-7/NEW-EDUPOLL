import { X } from 'lucide-react';
import styles from './CreatePollModal.module.css'; // Reuse basic modal overlay

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: '420px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title || "Delete Confirmation"}</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className={styles.body} style={{ gap: '1rem', padding: '1.5rem' }}>
          <p style={{ color: '#8e95b3', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
            {message || "Are you sure you want to delete this?"}
          </p>
        </div>
        
        <div className={styles.footer} style={{ borderTop: 'none', paddingTop: 0 }}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button 
            className={styles.createBtn} 
            style={{ 
              backgroundColor: '#ef4444', 
              color: 'white',
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)' 
            }}
            onClick={onConfirm}
          >
            {confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
