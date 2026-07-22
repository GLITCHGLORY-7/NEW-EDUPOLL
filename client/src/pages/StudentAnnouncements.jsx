import { useState, useEffect } from 'react';
import { Megaphone, Bell, ChevronDown, ChevronUp, Pin, Globe, BookOpen } from 'lucide-react';
import { getAnnouncements, markAnnouncementRead, getCurrentUser } from '../services/api';

function timeFormat(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AnnCard({ ann, onRead }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!ann.is_read) {
      markAnnouncementRead(ann.id).catch(() => {});
      onRead(ann.id);
    }
  }, [ann.id]);

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${ann.is_pinned ? 'rgba(245,158,11,0.4)' : ann.is_read ? 'var(--border-color)' : 'rgba(94,106,210,0.4)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      borderLeft: ann.is_pinned ? '3px solid #f59e0b' : !ann.is_read ? '3px solid var(--accent)' : '1px solid var(--border-color)',
      transition: 'all 0.2s'
    }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {ann.is_pinned && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
            <Pin size={10} /> Pinned
          </span>
        )}
        {ann.is_global && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase' }}>
            <Globe size={10} /> Global
          </span>
        )}
        {!ann.is_read && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: 'rgba(94,106,210,0.15)', color: '#818cf8', fontWeight: 700 }}>
            NEW
          </span>
        )}
      </div>
      
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>{ann.title}</h3>
      <p style={{
        fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 0.75rem 0',
        display: expanded ? 'block' : '-webkit-box',
        WebkitLineClamp: expanded ? 'unset' : 3,
        WebkitBoxOrient: 'vertical',
        overflow: expanded ? 'visible' : 'hidden'
      }}>{ann.body}</p>
      
      {ann.body.length > 150 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          background: 'transparent', border: 'none', color: 'var(--accent)',
          fontSize: '0.78rem', cursor: 'pointer', padding: 0, marginBottom: '0.75rem'
        }}>
          {expanded ? <><ChevronUp size={13} /> Show less</> : <><ChevronDown size={13} /> Read more</>}
        </button>
      )}
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>
            {ann.author_name?.[0] || 'S'}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{ann.author_name}</div>
            {ann.author_position && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{ann.author_position}</div>}
          </div>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{timeFormat(ann.created_at)}</span>
      </div>
    </div>
  );
}

export default function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnnouncements().then(setAnnouncements).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRead = (id) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const pinned = announcements.filter(a => a.is_pinned);
  const regular = announcements.filter(a => !a.is_pinned);
  const unread = announcements.filter(a => !a.is_read).length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
          <Megaphone size={22} /> Announcements
          {unread > 0 && (
            <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', fontWeight: 700 }}>
              {unread} new
            </span>
          )}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Updates and notices from your teachers</p>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 140, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', animation: 'shimmer 1.5s infinite' }} />
          ))}
        </div>
      )}

      {!loading && announcements.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <Bell size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-main)' }}>No announcements yet</h3>
          <p>Your teachers haven't posted any announcements yet. Check back later!</p>
        </div>
      )}

      {pinned.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
            <Pin size={13} /> Pinned
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {pinned.map(ann => <AnnCard key={ann.id} ann={ann} onRead={handleRead} />)}
          </div>
        </section>
      )}

      {regular.length > 0 && (
        <section>
          {pinned.length > 0 && (
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
              Recent
            </h2>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {regular.map(ann => <AnnCard key={ann.id} ann={ann} onRead={handleRead} />)}
          </div>
        </section>
      )}
    </div>
  );
}
