import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, Trash2, Filter, Search, CheckCheck } from 'lucide-react';
import { getConversations, getAnnouncements, getCurrentUser } from '../services/api';
import styles from './NotificationCenter.module.css';

const CATEGORY_CONFIG = {
  message:      { emoji: '🟣', label: 'Message',      color: '#a78bfa' },
  announcement: { emoji: '🟠', label: 'Announcement', color: '#f59e0b' },
  poll:         { emoji: '🟢', label: 'Poll',         color: '#10b981' },
  deadline:     { emoji: '🔴', label: 'Deadline',     color: '#ef4444' },
  system:       { emoji: '⚪', label: 'System',       color: '#6b7280' },
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const [convs, anns] = await Promise.all([
        getConversations().catch(() => []),
        getAnnouncements().catch(() => []),
      ]);

      const msgNotifs = (convs || [])
        .filter(c => c.unread_count > 0)
        .map(c => ({
          id: `msg-${c.id}`,
          type: 'message',
          title: 'New Message',
          description: `${c.unread_count} unread from ${c.other_user_name || 'Someone'}`,
          time: c.last_message_at || c.created_at,
          read: false,
          conversationId: c.id,
        }));

      const annNotifs = (anns || [])
        .filter(a => !a.read)
        .slice(0, 10)
        .map(a => ({
          id: `ann-${a.id}`,
          type: 'announcement',
          title: 'Announcement',
          description: a.title || a.message?.substring(0, 60) || 'New announcement',
          time: a.created_at,
          read: false,
        }));

      setNotifications([...msgNotifs, ...annNotifs].sort((a, b) =>
        new Date(b.time) - new Date(a.time)
      ));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) setTimeout(() => document.addEventListener('mousedown', handleOutside), 100);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotif = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => setNotifications([]);

  const filtered = notifications.filter(n => {
    if (filter !== 'all' && n.type !== filter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) &&
        !n.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatTime = (t) => {
    if (!t) return '';
    const d = new Date(t);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button
        className={styles.bellBtn}
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          {/* Panel Header */}
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Notifications</span>
            <div className={styles.headerActions}>
              {unreadCount > 0 && (
                <button className={styles.iconBtn} onClick={markAllRead} title="Mark all read">
                  <CheckCheck size={15} />
                </button>
              )}
              <button className={styles.iconBtn} onClick={clearAll} title="Clear all">
                <Trash2 size={15} />
              </button>
              <button className={styles.iconBtn} onClick={() => setOpen(false)}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search notifications..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category Filters */}
          <div className={styles.filterBar}>
            {['all', 'message', 'announcement', 'poll', 'deadline'].map(cat => (
              <button
                key={cat}
                className={`${styles.filterBtn} ${filter === cat ? styles.filterActive : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat === 'all' ? 'All' : CATEGORY_CONFIG[cat]?.emoji + ' ' + CATEGORY_CONFIG[cat]?.label}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div className={styles.list}>
            {loading && <div className={styles.loading}>Loading...</div>}
            {!loading && filtered.length === 0 && (
              <div className={styles.empty}>
                <span style={{ fontSize: '2rem' }}>🔔</span>
                <span>You're all caught up!</span>
              </div>
            )}
            {filtered.map(n => {
              const cat = CATEGORY_CONFIG[n.type] || CATEGORY_CONFIG.system;
              return (
                <div key={n.id} className={`${styles.notifItem} ${n.read ? styles.read : ''}`}>
                  <div className={styles.notifEmoji} style={{ background: `${cat.color}20` }}>
                    {cat.emoji}
                  </div>
                  <div className={styles.notifBody} onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                    const isStaff = getCurrentUser()?.role === 'staff';
                    if (n.type === 'message') {
                      navigate(isStaff ? '/messages' : '/student/messages');
                    } else if (n.type === 'announcement') {
                      navigate(isStaff ? '/announcements' : '/student/announcements');
                    } else if (n.type === 'poll' || n.type === 'deadline') {
                      navigate(isStaff ? '/polls' : '/student/my-polls');
                    }
                  }} style={{ cursor: 'pointer' }}>
                    <div className={styles.notifTitle}>{n.title}</div>
                    <div className={styles.notifDesc}>{n.description}</div>
                    <div className={styles.notifTime}>{formatTime(n.time)}</div>
                  </div>
                  <div className={styles.notifActions}>
                    {!n.read && (
                      <button className={styles.actionIcon} onClick={() => markRead(n.id)} title="Mark read">
                        <Check size={13} />
                      </button>
                    )}
                    <button className={styles.actionIcon} onClick={() => deleteNotif(n.id)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
