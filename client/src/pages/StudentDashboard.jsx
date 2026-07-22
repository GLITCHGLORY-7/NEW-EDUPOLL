import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Clock, Megaphone, MessageSquare, BookOpen, TrendingUp, Bell, ChevronRight, Users } from 'lucide-react';
import { 
  getCurrentUser, getStudentActivePolls, getStudentAllPolls,
  getAnnouncements, getConversations, getClassroomStaff, getStudentResponses
} from '../services/api';

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        background: `${color}15`,
        color: color,
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem',
        display: 'flex'
      }}>
        <Icon size={22} />
      </div>
      <div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{label}</div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [activePolls, setActivePolls] = useState([]);
  const [allPolls, setAllPolls] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const { getStudentProfile } = await import('../services/api');
        const [active, all, anns, convs, responses, profile] = await Promise.all([
          getStudentActivePolls().catch(() => []),
          getStudentAllPolls().catch(() => []),
          getAnnouncements().catch(() => []),
          getConversations().catch(() => []),
          getStudentResponses().catch(() => []),
          getStudentProfile().catch(() => ({}))
        ]);
        
        const answeredPollIds = new Set((responses || []).map(r => r.pollId));
        
        const activeMapped = (Array.isArray(active) ? active : []).map(p => ({
          ...p,
          hasAnswered: answeredPollIds.has(p.id)
        })).sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));
        
        const allMapped = (Array.isArray(all) ? all : []).map(p => ({
          ...p,
          hasAnswered: answeredPollIds.has(p.id)
        })).sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));

        setActivePolls(activeMapped);
        setAllPolls(allMapped);
        setAnnouncements(anns);
        setConversations(convs);

        // Load staff directly from fetched profile to avoid localStorage race condition
        if (profile && profile.classrooms && Array.isArray(profile.classrooms)) {
          const uniqueStaff = [];
          const seen = new Set();
          profile.classrooms.forEach(c => {
            if (c.staffId && c.staffId !== 'SAIRAM' && !seen.has(c.staffId)) {
              seen.add(c.staffId);
              uniqueStaff.push({ id: c.staffId, name: c.staffName || 'Staff Member' });
            }
          });
          setStaff(uniqueStaff);
        }
      } catch {} finally { setLoading(false); }
    }
    fetchAll();
  }, []);

  const pending = allPolls.filter(p => p.status === 'live' && !p.hasAnswered);
  const completed = allPolls.filter(p => p.hasAnswered);
  const unreadMessages = conversations.filter(c => c.unread_count > 0).reduce((a, b) => a + b.unread_count, 0);
  const unreadAnn = announcements.filter(a => !a.is_read).length;
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good Morning' : greetingHour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
          Here's what's happening in your classroom today
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={CheckSquare} label="Active Polls" value={activePolls.length} color="#10b981" onClick={() => navigate('/student')} />
        <StatCard icon={Clock} label="Pending Polls" value={pending.length} color="#f59e0b" onClick={() => navigate('/student/my-polls')} />
        <StatCard icon={TrendingUp} label="Completed" value={completed.length} color="#6366f1" onClick={() => navigate('/student/history')} />
        <StatCard icon={MessageSquare} label="Unread Messages" value={unreadMessages} color="#8b5cf6" onClick={() => navigate('/student/messages')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Active Polls */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={16} color="#10b981" /> Active Polls
            </h3>
            <button onClick={() => navigate('/student')} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              View All <ChevronRight size={12} />
            </button>
          </div>
          {activePolls.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No active polls right now</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {activePolls.slice(0, 3).map(poll => (
                <div key={poll.id} onClick={() => navigate('/student')} style={{
                  padding: '0.75rem',
                  background: 'var(--bg-color)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{poll.question || poll.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>By {poll.staff_name || poll.createdBy || 'Staff'}</span>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontWeight: 700 }}>LIVE</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone size={16} color="#f59e0b" /> Announcements
              {unreadAnn > 0 && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: 700 }}>{unreadAnn}</span>}
            </h3>
            <button onClick={() => navigate('/student/announcements')} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              View All <ChevronRight size={12} />
            </button>
          </div>
          {announcements.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No announcements</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {announcements.slice(0, 3).map(ann => (
                <div key={ann.id} onClick={() => navigate('/student/announcements')} style={{
                  padding: '0.75rem',
                  background: 'var(--bg-color)',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${!ann.is_read ? 'rgba(94,106,210,0.3)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  borderLeft: !ann.is_read ? '3px solid var(--accent)' : '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{ann.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>By {ann.author_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages/Recent Chats */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} color="#8b5cf6" /> Messages
              {unreadMessages > 0 && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: 700 }}>{unreadMessages}</span>}
            </h3>
            <button onClick={() => navigate('/student/messages')} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              View All <ChevronRight size={12} />
            </button>
          </div>
          {conversations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No messages yet. Chat with your teachers!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {conversations.slice(0, 3).map(conv => (
                <div key={conv.id} onClick={() => navigate('/student/messages')} style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem',
                  padding: '0.625rem', background: 'var(--bg-color)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', cursor: 'pointer'
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {conv.other_name?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>{conv.other_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.last_message || 'No messages yet'}</div>
                  </div>
                  {conv.unread_count > 0 && (
                    <span style={{ background: 'var(--accent)', color: '#fff', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '1rem', fontWeight: 700 }}>{conv.unread_count}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>


      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: 'View Polls', icon: CheckSquare, path: '/student', color: '#10b981' },
            { label: 'Messages', icon: MessageSquare, path: '/student/messages', color: '#8b5cf6' },
            { label: 'Announcements', icon: Megaphone, path: '/student/announcements', color: '#f59e0b' },
            { label: 'Poll History', icon: Clock, path: '/student/history', color: '#6366f1' },
            { label: 'My Profile', icon: BookOpen, path: '/student/profile', color: '#ec4899' },
          ].map(({ label, icon: Icon, path, color }) => (
            <button key={path} onClick={() => navigate(path)} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: `${color}15`, border: `1px solid ${color}33`,
              color, borderRadius: 'var(--radius-md)',
              padding: '0.5rem 1rem', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.15s'
            }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
