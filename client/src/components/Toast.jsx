import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import styles from './Toast.module.css';

export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.toast} ${type === 'error' ? styles.error : styles.success}`}>
      <div className={styles.iconWrapper}>
        {type === 'error' ? (
          <AlertCircle size={20} className={styles.errorIcon} />
        ) : (
          <CheckCircle2 size={20} className={styles.successIcon} />
        )}
      </div>
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
      </div>
      <button className={styles.closeBtn} onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
