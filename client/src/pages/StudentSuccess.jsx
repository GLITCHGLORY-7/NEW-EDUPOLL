import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './StudentSuccess.module.css';

export default function StudentSuccess() {
  return (
    <div className={styles.container}>
      <div className={styles.successCard}>
        <div className={styles.iconWrapper}>
          <div className={styles.dots}></div>
          <CheckCircle2 size={80} color="white" fill="#10b981" />
        </div>
        
        <h2 className={styles.title}>Your response has been submitted!</h2>
        <p className={styles.subtitle}>Thank you for your response.</p>
        
        <Link to="/student" className={styles.backLink}>
          Back to Active Poll
        </Link>
      </div>
    </div>
  );
}
