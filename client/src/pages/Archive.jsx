import { useState, useEffect } from 'react';
import { Search, Filter, Shield, BarChart3, RefreshCw, Trash2, ArrowUpRight, Download, Eye, Play } from 'lucide-react';
import { 
  getArchivedPolls, restorePoll, deletePoll, getClassrooms, 
  getPollResults, getCurrentUser, triggerCleanup 
} from '../services/api';
import { generateMobileReport } from '../utils/generateMobileReport';
import { generateDesktopReport } from '../utils/generateDesktopReport';
import ConfirmModal from '../components/ConfirmModal';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import styles from './AdminPolls.module.css'; // Reuse AdminPolls layout system

export default function Archive() {
  const [polls, setPolls] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClassroom, setFilterClassroom] = useState('all');
  const [filterStaff, setFilterStaff] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [downloadingPollId, setDownloadingPollId] = useState(null);
  const [activeReportPoll, setActiveReportPoll] = useState(null);
  const [activeReportResults, setActiveReportResults] = useState(null);

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.id === 'SAIRAM';

  const loadData = async () => {
    setLoading(true);
    try {
      const [pollsData, classroomsData] = await Promise.all([
        getArchivedPolls(),
        getClassrooms()
      ]);
      setPolls(pollsData || []);
      setClassrooms(classroomsData || []);
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Failed to load archived polls.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunCleanup = async () => {
    setShowCleanupConfirm(false);
    setIsCleaning(true);
    try {
      const res = await triggerCleanup();
      if (window.showToast) {
        window.showToast(
          `Cleanup finished! Deleted ${res.deletedMessagesCount || 0} messages, ${res.deletedAnnouncementsCount || 0} announcements/notifications, ${res.deletedReportsCount || 0} reports.`,
          'success'
        );
      }
      loadData();
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Failed to trigger database cleanup.', 'error');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      await restorePoll(restoreTarget.id);
      if (window.showToast) window.showToast('Poll restored to active closed list successfully.', 'success');
      setRestoreTarget(null);
      loadData();
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Failed to restore poll.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePoll(deleteTarget.id);
      if (window.showToast) window.showToast('Poll permanently deleted.', 'success');
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Failed to delete poll.', 'error');
    }
  };

  const getGroupedData = (poll, results) => {
    if (!poll || !results?.responses) return { groups: {}, notAnswered: [], rate: "0" };
    const groups = {};
    poll.options?.choices?.forEach(choice => {
      groups[choice] = [];
    });
    results.responses.forEach(student => {
      const choice = student.choice;
      if (groups[choice]) {
        groups[choice].push(student);
      } else {
        if (!groups['Other']) groups['Other'] = [];
        groups['Other'].push(student);
      }
    });
    const notAnswered = results.notAnswered || [];
    const rate = results.totalStudents > 0 
      ? ((results.totalResponses / results.totalStudents) * 100).toFixed(1)
      : "0.0";
    return { groups, notAnswered, rate };
  };

  const handleDownloadMobile = async (poll) => {
    setDownloadingPollId(poll.id);
    if (window.showToast) window.showToast('Compiling mobile report data...', 'info');
    try {
      const results = await getPollResults(poll.id);
      await generateMobileReport({
        selectedPoll: poll,
        results,
        classrooms,
        currentUser
      });
      if (window.showToast) window.showToast('Mobile report downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Failed to generate mobile report.', 'error');
    } finally {
      setDownloadingPollId(null);
    }
  };

  const handleDownloadDesktop = async (poll) => {
    setDownloadingPollId(poll.id);
    if (window.showToast) window.showToast('Compiling desktop report data...', 'info');
    try {
      const results = await getPollResults(poll.id);
      setActiveReportPoll(poll);
      setActiveReportResults(results);
      
      // Wait for DOM repaint so html2canvas sees the populated page
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await generateDesktopReport(
        poll.id,
        () => {},
        () => {
          setActiveReportPoll(null);
          setActiveReportResults(null);
        },
        window.showToast
      );
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Failed to generate desktop report.', 'error');
      setActiveReportPoll(null);
      setActiveReportResults(null);
    } finally {
      setDownloadingPollId(null);
    }
  };

  // Local Filter Logic
  const filteredPolls = polls
    .filter(p => filterClassroom === 'all' || p.classroomId === filterClassroom)
    .filter(p => filterStaff === 'all' || p.staffId === filterStaff)
    .filter(p => !search || p.question?.toLowerCase().includes(search.toLowerCase()));

  // Unique staff filter list (Admin only)
  const uniqueStaff = [];
  const seenStaff = new Set();
  polls.forEach(p => {
    if (p.staffId && !seenStaff.has(p.staffId)) {
      seenStaff.add(p.staffId);
      uniqueStaff.push({ id: p.staffId, name: p.staffName || 'Staff' });
    }
  });

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 className={styles.title}>{isAdmin ? 'Archive Management' : 'Archived Polls'}</h2>
          <p className={styles.subtitle}>Manage expired and archived classroom records ({filteredPolls.length} items)</p>
        </div>
        {isAdmin && (
          <button 
            className={styles.createBtn} 
            onClick={() => setShowCleanupConfirm(true)} 
            disabled={isCleaning}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#6366f1' }}
          >
            <RefreshCw size={15} className={isCleaning ? 'animate-spin' : ''} />
            {isCleaning ? 'Cleaning...' : 'Run Cleanup Now'}
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className={styles.filterBar} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 2, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className={styles.filterInput}
            placeholder="Search archived polls..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem', width: '100%' }}
          />
        </div>

        <select 
          className={styles.filterInput} 
          value={filterClassroom} 
          onChange={e => setFilterClassroom(e.target.value)}
          style={{ flex: 1, minWidth: '150px' }}
        >
          <option value="all">All Classrooms</option>
          {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {isAdmin && uniqueStaff.length > 0 && (
          <select 
            className={styles.filterInput} 
            value={filterStaff} 
            onChange={e => setFilterStaff(e.target.value)}
            style={{ flex: 1, minWidth: '150px' }}
          >
            <option value="all">All Staff</option>
            {uniqueStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Poll list */}
      {loading ? (
        <SkeletonLoader type="card" count={3} />
      ) : filteredPolls.length === 0 ? (
        <EmptyState
          icon="📦"
          title={search ? 'No archived polls found' : 'Archive is empty'}
          description={search ? 'Try clearing your filters.' : 'Polls automatically move here 15 days after their expiration date.'}
          actionLabel={search ? 'Clear Filters' : ''}
          onAction={() => { setSearch(''); setFilterClassroom('all'); setFilterStaff('all'); }}
        />
      ) : (
        <div className={styles.pollGrid}>
          {filteredPolls.map(poll => {
            const createdStr = new Date(poll.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const archivedStr = new Date(poll.archivedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            
            return (
              <div key={poll.id} className={styles.pollCard} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: 0.9 }}>
                <div className={styles.pollCardTop} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className={styles.pollBadges} style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <span className={`${styles.badge} ${styles.badgeClassroom}`}>
                      🏫 {poll.classroomName}
                    </span>
                    <span className={`${styles.badge} ${styles.badgeClosed}`} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
                      ● Archived
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {isAdmin && (
                      <button 
                        className={styles.editBtn} 
                        onClick={() => setRestoreTarget(poll)} 
                        title="Restore Poll to active list"
                        style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                      >
                        <Play size={13} />
                      </button>
                    )}
                    <button 
                      className={styles.deleteBtn} 
                      onClick={() => setDeleteTarget(poll)} 
                      title="Permanently Delete Poll & Responses"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <h4 className={styles.pollQuestion} style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0.2rem 0' }}>{poll.question}</h4>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Created by: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{poll.staffName}</span></span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Timeline: {createdStr} → {archivedStr}</span>
                  </div>

                  {!isAdmin && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleDownloadDesktop(poll)}
                        disabled={downloadingPollId !== null}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          backgroundColor: 'rgba(52, 211, 153, 0.15)',
                          border: '1px solid rgba(52, 211, 153, 0.3)',
                          color: '#6ee7b7',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          cursor: downloadingPollId !== null ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Download size={12} />
                        {downloadingPollId === poll.id ? 'Desktop...' : 'Desktop PDF'}
                      </button>
                      <button
                        onClick={() => handleDownloadMobile(poll)}
                        disabled={downloadingPollId !== null}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          backgroundColor: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#a5b4fc',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          cursor: downloadingPollId !== null ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Download size={12} />
                        {downloadingPollId === poll.id ? 'Mobile...' : 'Mobile PDF'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Restore Confirm */}
      <ConfirmModal
        isOpen={!!restoreTarget}
        title="Restore Archived Poll"
        message={`Are you sure you want to restore "${restoreTarget?.question}" back to the active closed list? Staff and admin will be able to view its standard reports directly again.`}
        confirmText="Restore"
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Permanently Delete Poll"
        message={`Warning: You are about to permanently delete "${deleteTarget?.question}". This will wipe all associated student responses from the database. This action cannot be undone.`}
        confirmText="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {/* Cleanup Confirm */}
      <ConfirmModal
        isOpen={showCleanupConfirm}
        title="Run Storage Cleanup"
        message="Are you sure you want to run the database storage cleanup service? This will delete all expired messages, announcements, and stored reports older than 15 days, and archive expired polls."
        confirmText="Run Cleanup"
        onClose={() => setShowCleanupConfirm(false)}
        onConfirm={handleRunCleanup}
      />

      {/* Hidden container for Desktop A4 HTML rendering */}
      {activeReportPoll && activeReportResults && (() => {
        const { groups, notAnswered, rate } = getGroupedData(activeReportPoll, activeReportResults);
        const createdDateStr = new Date(activeReportPoll.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const createdTimeStr = new Date(activeReportPoll.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const deadlineDateStr = activeReportPoll.options?.expiresAt 
          ? `${new Date(activeReportPoll.options.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(activeReportPoll.options.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
          : 'No Deadline';
        const classroom = classrooms.find(c => c.id === activeReportPoll.classroomId);

        return (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '210mm', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
            <div id="report-page-1" style={{ width: '210mm', minHeight: '297mm', padding: '15mm 12mm', boxSizing: 'border-box', backgroundColor: '#ffffff' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg width="45" height="45" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="46" stroke="#1e3a8a" strokeWidth="8" fill="#ffffff"/>
                    <path d="M25 45 L50 30 L75 45 L50 60 Z" fill="#1e3a8a"/>
                    <path d="M35 51 L35 70 C35 75, 65 75, 65 70 L65 51" stroke="#1e3a8a" strokeWidth="6" strokeLinecap="round" fill="none"/>
                    <path d="M75 45 L75 65" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round"/>
                    <circle cx="75" cy="65" r="4" fill="#1e3a8a"/>
                  </svg>
                  <div>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.05em', lineHeight: 1 }}>EDUPOLL</span>
                    <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.02em' }}>Smart Polling. Better Learning.</div>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <div style={{ height: '2px', backgroundColor: '#1e3a8a', width: '20px' }}></div>
                    <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.05em' }}>EDUPOLL</span>
                    <div style={{ height: '2px', backgroundColor: '#1e3a8a', width: '20px' }}></div>
                  </div>
                  <h1 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0 0 0', letterSpacing: '0.03em' }}>CLASSROOM POLL REPORT (ARCHIVED)</h1>
                </div>
              </div>

              {/* Info Card */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', padding: '1.25rem', marginBottom: '1.25rem', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '120px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Poll Title</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', flex: 1 }}>{activeReportPoll.question}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '120px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Description</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155', flex: 1 }}>{activeReportPoll.description || 'No description provided.'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '120px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Created By</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', flex: 1 }}>{activeReportPoll.staffName || 'Staff Member'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '120px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Classroom</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', flex: 1 }}>{classroom?.name || activeReportPoll.classroomName}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', borderLeft: '1px solid #cbd5e1', paddingLeft: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '100px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Poll Type</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{activeReportPoll.itemType === 'activity' ? 'Activity' : 'Classroom Poll'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '100px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Created On</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{createdDateStr} {createdTimeStr}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '100px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Deadline</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{deadlineDateStr}</span>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: '#1e3a8a', color: '#ffffff', textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', padding: '0.4rem 0', borderRadius: '4px 4px 0 0', letterSpacing: '0.1em' }}>
                  SUMMARY
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${4 + Object.keys(groups).length}, 1fr)`, borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>
                  <div style={{ padding: '0.75rem 0.25rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Students</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{activeReportResults.totalStudents}</span>
                  </div>
                  <div style={{ padding: '0.75rem 0.25rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Submitted</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{activeReportResults.totalResponses}</span>
                  </div>
                  <div style={{ padding: '0.75rem 0.25rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Not Responded</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{notAnswered.length}</span>
                  </div>
                  {Object.entries(groups).map(([option, students], idx) => (
                    <div key={idx} style={{ padding: '0.75rem 0.25rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{option}</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{students.length}</span>
                    </div>
                  ))}
                  <div style={{ padding: '0.75rem 0.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Response Rate</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{rate}%</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Option Tables */}
              {Object.entries(groups).map(([option, students], gIdx) => {
                const isPositive = option.toLowerCase() === 'done' || option.toLowerCase() === 'yes';
                const themeColor = isPositive ? '#16a34a' : '#dc2626';
                const lightBg = isPositive ? '#f0fdf4' : '#fef2f2';
                
                return (
                  <div key={gIdx} style={{ marginTop: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', backgroundColor: lightBg, borderLeft: `4px solid ${themeColor}`, borderRadius: '4px', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: themeColor }}>
                        {gIdx + 1}. STUDENTS WHO SELECTED "{option.toUpperCase()}" ({students.length})
                      </span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #cbd5e1' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '5%', textAlign: 'center', color: '#475569' }}>No.</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '15%', color: '#475569' }}>SEC ID</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '35%', color: '#475569' }}>Student Name</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '20%', textAlign: 'center', color: '#475569' }}>Selected Option</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '25%', color: '#475569' }}>Submitted Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center', color: '#6b7280' }}>No students.</td>
                          </tr>
                        ) : (
                          students.map((s, idx) => (
                            <tr key={s.id} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', textAlign: 'center' }}>{idx + 1}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', fontFamily: 'monospace' }}>{s.id}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', fontWeight: 600 }}>{s.name}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', textAlign: 'center', color: themeColor, fontWeight: 700 }}>{option}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem' }}>
                                {s.submitted_at ? new Date(s.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}

              {/* Not Responded Table */}
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.75rem', backgroundColor: '#eff6ff', borderLeft: '4px solid #2563eb', borderRadius: '4px', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2563eb' }}>
                    {Object.keys(groups).length + 1}. STUDENTS WHO DID NOT RESPOND ({notAnswered.length})
                  </span>
                </div>
                {notAnswered.length === 0 ? (
                  <div style={{ padding: '0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#15803d', fontWeight: 700, textAlign: 'center', fontSize: '0.8rem' }}>
                    🎉 All students have successfully submitted their responses!
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #cbd5e1' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '10%', textAlign: 'center', color: '#475569' }}>No.</th>
                        <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '30%', color: '#475569' }}>SEC ID</th>
                        <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '60%', color: '#475569' }}>Student Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notAnswered.map((s, idx) => (
                        <tr key={s.id} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', fontFamily: 'monospace' }}>{s.id}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', fontWeight: 600 }}>{s.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div style={{ marginTop: '2.5rem', borderTop: '1px solid #cbd5e1', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontSize: '0.75rem', color: '#475569' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>Generated by EduPoll</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Smart Polling. Better Learning.</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800 }}>Generated On</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 800 }}>Page 1 of 1</div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
