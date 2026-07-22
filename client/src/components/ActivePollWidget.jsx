import { QRCodeSVG } from 'qrcode.react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Copy } from 'lucide-react';
import styles from './ActivePollWidget.module.css';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function ActivePollWidget({ poll, results, onClearResponses }) {
  const pollUrl = `${window.location.origin}/poll/${poll.id}`;

  const optionsArray = Array.isArray(poll.options) ? poll.options : [];
  // Calculate dynamic pie chart data based on options
  const data = optionsArray.map((opt, index) => {
    const count = results.answered.filter(r => r.status === opt).length;
    return {
      name: opt,
      value: count,
      color: COLORS[index % COLORS.length]
    };
  });

  const total = results.answered.length;

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3 className={styles.title}>Active Poll</h3>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {onClearResponses && (
            <button 
              onClick={onClearResponses}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '0.25rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Clear Responses
            </button>
          )}
          <span className={styles.badge}>LIVE</span>
        </div>
      </div>
      
      <p className={styles.question}>{poll.question}</p>
      <p className={styles.subtitle}>Multiple answers not allowed</p>

      <div className={styles.content}>
        <div className={styles.qrSection}>
          <div className={styles.qrCode}>
            <QRCodeSVG value={pollUrl} size={100} />
          </div>
          <p className={styles.qrText}>Scan QR code or share link<br/>with your students</p>
          <div className={styles.linkBox}>
            <span className={styles.linkText}>{pollUrl}</span>
            <button 
              className={styles.copyBtn} 
              title="Copy link"
              onClick={() => {
                navigator.clipboard.writeText(pollUrl);
                if(window.showToast) window.showToast("Link copied to clipboard!", "success");
              }}
            >
              <Copy size={14} />
            </button>
          </div>
        </div>

        <div className={styles.chartSection}>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Tooltip />
                <Pie
                  data={data}
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.chartCenterText}>
              <span className={styles.totalText}>Total<br/>Responses</span>
              <span className={styles.totalNumber}>{total}</span>
            </div>
          </div>
          
          <div className={styles.legend}>
            {data.map(entry => (
              <div key={entry.name} className={styles.legendItem}>
                <span className={styles.dot} style={{ backgroundColor: entry.color }}></span>
                <span>{entry.name}</span>
                <span className={styles.percent}>
                  {entry.value} ({total === 0 ? 0 : Math.round((entry.value / total) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>


      </div>
    </div>
  );
}
