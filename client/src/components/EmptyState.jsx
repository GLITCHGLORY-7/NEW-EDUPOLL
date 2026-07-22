import styles from './EmptyState.module.css';

/**
 * Reusable Empty State component
 * Props: icon (emoji string), title, description, actionLabel, onAction
 */
export default function EmptyState({ icon = '📭', title = 'Nothing here yet', description = '', actionLabel = '', onAction = null }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.iconWrap}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.desc}>{description}</p>}
      {actionLabel && onAction && (
        <button className={styles.actionBtn} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
