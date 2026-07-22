import styles from './SkeletonLoader.module.css';

/**
 * Animated skeleton loader components
 * Usage: <SkeletonLoader type="card" count={3} />
 * Types: card | row | message | stat
 */
export default function SkeletonLoader({ type = 'card', count = 3 }) {
  const items = Array.from({ length: count });

  if (type === 'card') {
    return (
      <div className={styles.cardGrid}>
        {items.map((_, i) => (
          <div key={i} className={styles.card}>
            <div className={styles.shimmer}>
              <div className={`${styles.bar} ${styles.barShort}`} />
              <div className={`${styles.bar} ${styles.barFull}`} />
              <div className={`${styles.bar} ${styles.barMed}`} />
              <div className={styles.footer}>
                <div className={`${styles.dot}`} />
                <div className={`${styles.bar} ${styles.barXs}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'row') {
    return (
      <div className={styles.rowList}>
        {items.map((_, i) => (
          <div key={i} className={styles.row}>
            <div className={styles.dot} />
            <div className={styles.rowContent}>
              <div className={`${styles.bar} ${styles.barMed}`} />
              <div className={`${styles.bar} ${styles.barXs}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'message') {
    return (
      <div className={styles.rowList}>
        {items.map((_, i) => (
          <div key={i} className={`${styles.row} ${i % 2 === 0 ? styles.rowLeft : styles.rowRight}`}>
            {i % 2 === 0 && <div className={styles.dot} />}
            <div className={`${styles.bubble} ${i % 2 !== 0 ? styles.bubbleRight : ''}`} />
            {i % 2 !== 0 && <div className={styles.dot} />}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'stat') {
    return (
      <div className={styles.statGrid}>
        {items.map((_, i) => (
          <div key={i} className={styles.statCard}>
            <div className={`${styles.bar} ${styles.barXs}`} />
            <div className={`${styles.bigNum}`} />
            <div className={`${styles.bar} ${styles.barFull}`} />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
