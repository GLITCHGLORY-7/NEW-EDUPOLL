import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from './ResponseOverviewWidget.module.css';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function ResponseOverviewWidget({ results, options }) {
  if (!results || !options) return null;

  const optionsArray = Array.isArray(options) ? options : [];
  
  const data = optionsArray.map((opt, index) => {
    const count = results.answered.filter(r => {
      if (Array.isArray(r.choice)) {
        return r.choice.includes(opt);
      }
      return r.status === opt;
    }).length;
    return {
      name: opt,
      value: count,
      color: COLORS[index % COLORS.length]
    };
  });

  return (
    <div className={styles.widget}>
      <h3 className={styles.title}>Response Overview (This Poll)</h3>
      
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip cursor={{ fill: 'transparent' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
