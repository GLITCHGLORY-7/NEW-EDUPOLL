import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, LayoutDashboard, Clock, CheckCircle, TrendingUp, 
  MessageSquare, Megaphone, Plus, FileText, Settings, Sparkles, AlertCircle, Activity, Shield 
} from 'lucide-react';
import ActivePollWidget from '../components/ActivePollWidget';
import StudentListWidget from '../components/StudentListWidget';
import RecentPollsWidget from '../components/RecentPollsWidget';
import ResponseOverviewWidget from '../components/ResponseOverviewWidget';
import { 
  getCurrentUser, getStaffPolls, getPollResults, generateAiSummary, 
  getPollsResponsesSummary, deleteStudentResponse, clearAllResponsesForPoll,
  getStudents, getMessagesUnreadCount, getAnnouncements, getClassrooms 
} from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const user = getCurrentUser();
  const isAdmin = user?.id === 'SAIRAM';

  const [polls, setPolls] = useState([]);
  const [pollsSummary, setPollsSummary] = useState([]);
  const [activePolls, setActivePolls] = useState([]);
  const [selectedActivePollId, setSelectedActivePollId] = useState(null);
  const [pollResultsMap, setPollResultsMap] = useState({});
  const [aiSummaryMap, setAiSummaryMap] = useState({});
  
  // New States for Upgrade
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Delete Response confirmation state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetResponseStudent, setTargetResponseStudent] = useState(null);
  const [targetResponsePollId, setTargetResponsePollId] = useState(null);

  const loadActivePollResults = async (pollId) => {
    try {
      const results = await getPollResults(pollId);
      setPollResultsMap(prev => ({ ...prev, [pollId]: results }));
      return results;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const triggerDeleteResponse = (student, pollId) => {
    setTargetResponseStudent(student);
    setTargetResponsePollId(pollId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteResponse = async () => {
    if (!targetResponsePollId || !targetResponseStudent) return;
    setIsDeleteModalOpen(false);
    try {
      await deleteStudentResponse(targetResponsePollId, targetResponseStudent.id);
      window.showToast(`Deleted response of ${targetResponseStudent.name} successfully!`, "success");
      await loadActivePollResults(targetResponsePollId);
      const fetchedSummary = await getPollsResponsesSummary();
      setPollsSummary(fetchedSummary);
    } catch (err) {
      console.error(err);
      window.showToast("Failed to delete response.", "error");
    } finally {
      setTargetResponseStudent(null);
      setTargetResponsePollId(null);
    }
  };

  const handleClearPollResponses = async (pollId) => {
    if (!window.confirm("Are you sure you want to clear all student responses for this poll? This cannot be undone.")) return;
    try {
      await clearAllResponsesForPoll(pollId);
      if (window.showToast) window.showToast("All poll responses cleared successfully!", "success");
      await loadActivePollResults(pollId);
      const fetchedSummary = await getPollsResponsesSummary();
      setPollsSummary(fetchedSummary);
    } catch(err) {
      console.error(err);
      if (window.showToast) window.showToast("Failed to clear responses.", "error");
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'staff') {
      navigate('/login');
      return;
    }

    async function fetchData() {
      try {
        const [fetchedPolls, fetchedSummary, studentsList, unreadData, annsData, classroomsData] = await Promise.all([
          getStaffPolls().catch(() => []),
          getPollsResponsesSummary().catch(() => []),
          getStudents().catch(() => []),
          getMessagesUnreadCount().catch(() => ({ count: 0 })),
          getAnnouncements().catch(() => []),
          getClassrooms().catch(() => [])
        ]);

        setTotalStudentsCount(studentsList.length || 0);
        setUnreadMsgCount(unreadData.count || 0);
        setRecentAnnouncements(annsData.slice(0, 3));
        setClassrooms(classroomsData || []);

        if (isAdmin) {
          const token = localStorage.getItem('token');
          const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/staff`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setStaffList(data);
          }
        }

        if (Array.isArray(fetchedPolls)) {
          setPolls(fetchedPolls);
          setPollsSummary(fetchedSummary);
          
          const active = fetchedPolls.filter(p => p.status === 'live');
          setActivePolls(active);
          if (active.length > 0) {
            setSelectedActivePollId(active[0].id);
          }

          // Fetch active poll results in parallel and queue AI summaries non-blockingly
          await Promise.all(active.map(async (poll) => {
            const results = await loadActivePollResults(poll.id);
            if (results) {
              generateAiSummary({
                pollQuestion: poll.question,
                options: poll.options,
                results: { answered: results.answered.length, notAnswered: results.notAnswered.length }
              }).then(summaryData => {
                if (summaryData?.summary) {
                  setAiSummaryMap(prev => ({ ...prev, [poll.id]: summaryData.summary }));
                }
              }).catch(e => {
                console.log(`AI Summary failed for poll ${poll.id}`);
              });
            }
          }));
        } else {
          setPolls([]);
          setPollsSummary([]);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [navigate, isAdmin]);

  if (loading) return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;

  // ── ADMIN VIEW ──
  if (isAdmin) {
    const activeClassroomsCount = classrooms.filter(c => c.active_poll_id).length;
    return (
      <div className={styles.dashboard}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Institution Administration Portal</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
            System overview and institution management.
          </p>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className={styles.statCard} onClick={() => navigate('/classrooms')} style={{ cursor: 'pointer' }}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(94, 106, 210, 0.12)', color: 'var(--accent)' }}>
              <TrendingUp size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Total Classrooms</span>
              <span className={styles.statValue}>{classrooms.length}</span>
            </div>
          </div>

          <div className={styles.statCard} onClick={() => navigate('/staff')} style={{ cursor: 'pointer' }}>
            <div className={styles.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
              <Shield size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Total Staff</span>
              <span className={styles.statValue}>{staffList.length}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/classrooms')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.8rem' }}>
              <Plus size={14} /> Create Classroom
            </button>
            <button onClick={() => navigate('/staff')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.8rem' }}>
              <Plus size={14} /> Add Staff
            </button>
            <button onClick={() => navigate('/announcements')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.8rem' }}>
              <Megaphone size={14} /> Post Global Announcement
            </button>
            <button onClick={() => navigate('/settings')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.8rem' }}>
              <Settings size={14} /> Institution Settings
            </button>
          </div>
        </div>

        {/* Global Announcements */}
        <div>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Recent Global Announcements</h3>
              <span onClick={() => navigate('/announcements')} style={{ fontSize: '0.75rem', color: 'var(--accent)', cursor: 'pointer' }}>View All</span>
            </div>
            {recentAnnouncements.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '2rem' }}>No announcements posted.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentAnnouncements.map(ann => (
                  <div key={ann.id} style={{ padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.2rem' }}>{ann.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>By Admin</span>
                      <span>{new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── STAFF VIEW ──
  return (
    <div className={styles.dashboard}>
      {/* Header greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Classroom Communication Hub
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
            Manage polls, read announcements, and message students.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(94, 106, 210, 0.12)', color: 'var(--accent)' }}>
            <Activity size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Active Polls</span>
            <span className={styles.statValue}>{activePolls.length}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Students</span>
            <span className={styles.statValue}>{totalStudentsCount}</span>
          </div>
        </div>

        <div className={styles.statCard} onClick={() => navigate('/messages')} style={{ cursor: 'pointer' }}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <MessageSquare size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Unread Messages</span>
            <span className={styles.statValue}>{unreadMsgCount}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrapper} style={{ background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Activities</span>
            <span className={styles.statValue}>{polls.length}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-panel animate-fade-up" style={{ padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/polls')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.8rem' }}>
            <Plus size={14} /> Create Poll
          </button>
          <button onClick={() => navigate('/announcements')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.8rem' }}>
            <Megaphone size={14} /> Post Announcement
          </button>
          <button onClick={() => navigate('/reports')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.8rem' }}>
            <FileText size={14} /> View Reports
          </button>
          <button onClick={() => navigate('/students')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface-hover)', color: 'var(--text-main)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.8rem' }}>
            <Users size={14} /> Manage Students
          </button>
        </div>
      </div>

      {/* Active Poll Selector */}
      {activePolls.length === 0 && (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <LayoutDashboard size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
          <h3>No Active Polls</h3>
          <p>Create and launch a new poll from the Polls section.</p>
        </div>
      )}

      {activePolls.length > 1 && (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.85rem' }}>Select Poll to View:</span>
          <select 
            value={selectedActivePollId || ''} 
            onChange={(e) => setSelectedActivePollId(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
          >
            {activePolls.map(p => (
              <option key={p.id} value={p.id}>{p.question}</option>
            ))}
          </select>
        </div>
      )}

      {/* Main Content Grid for selected active poll */}
      {(() => {
        if (activePolls.length === 0 || !selectedActivePollId) return null;
        
        const poll = activePolls.find(p => p.id === selectedActivePollId);
        if (!poll) return null;
        const results = pollResultsMap[poll.id];

        return (
          <div key={poll.id} className="animate-fade-up">
            {aiSummaryMap[poll.id] && (
              <div className={styles.aiBanner}>
                 <Sparkles size={16} className={styles.aiSparkle} style={{ color: '#a5b4fc', marginTop: '2px' }} />
                 <div>
                   <span className={styles.aiSparkle}>AI Insight: </span>
                   {aiSummaryMap[poll.id]}
                 </div>
              </div>
            )}
            
            <div className={styles.mainGrid}>
              <div className={styles.activePollCard}>
                {results ? (
                  <ActivePollWidget poll={poll} results={results} onClearResponses={() => handleClearPollResponses(poll.id)} />
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading results for this poll...
                  </div>
                )}
              </div>
              <div className={styles.studentsListCard}>
                <StudentListWidget 
                  title="Answered" 
                  count={results?.answered?.length || 0} 
                  students={(results?.answered || []).map(s => ({ ...s, pollId: poll.id }))} 
                  type="answered" 
                  onDeleteResponse={(student) => triggerDeleteResponse(student, poll.id)}
                />
              </div>
              <div className={styles.studentsListCard}>
                <StudentListWidget 
                  title="Not Answered" 
                  count={results?.notAnswered?.length || 0} 
                  students={results?.notAnswered || []} 
                  type="notAnswered" 
                />
              </div>
            </div>
          </div>
        );
      })()}
      
      {/* Bottom Split Layout */}
      <div className={styles.bottomGrid}>
         <div className={styles.recentPollsCard}>
           <RecentPollsWidget pollsSummary={pollsSummary} />
         </div>

         {/* Announcements Sidebar */}
         <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
               <Megaphone size={16} color="var(--warning)" /> Latest Announcements
             </h3>
             <span onClick={() => navigate('/announcements')} style={{ fontSize: '0.75rem', color: 'var(--accent)', cursor: 'pointer' }}>View All</span>
           </div>
           
           {recentAnnouncements.length === 0 ? (
             <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, textAlign: 'center', padding: '1rem 0' }}>No announcements posted.</p>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               {recentAnnouncements.map(ann => (
                 <div key={ann.id} style={{ padding: '0.75rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                   <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.2rem' }}>{ann.title}</div>
                   <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                     <span>By {ann.author_name}</span>
                     <span>{new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Response"
        message={`Delete response submitted by "${targetResponseStudent?.name}"? They will be marked as unanswered, allowing them to vote/answer again.`}
        confirmText="Delete Response"
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTargetResponseStudent(null);
          setTargetResponsePollId(null);
        }}
        onConfirm={handleConfirmDeleteResponse}
      />
    </div>
  );
}
