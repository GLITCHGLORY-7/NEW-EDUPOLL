import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Globe, School, Search, X, BarChart3, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getClassrooms, createPoll, updatePoll, deletePoll, getStaffPolls, getPollsResponsesSummary, getCurrentUser } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import styles from './AdminPolls.module.css';

const POLL_TYPES = [
  { value: 'poll', label: 'Multiple Choice Poll' },
  { value: 'yes_no', label: 'Yes / No Poll' },
  { value: 'schedule', label: 'Schedule / Event' },
  { value: 'feedback', label: 'Feedback / Survey' },
  { value: 'anonymous', label: 'Anonymous Poll' },
];

function PollModal({ poll, classrooms, onClose, onSuccess }) {
  const [question, setQuestion] = useState(poll?.question || '');
  const [pollType, setPollType] = useState(poll?.itemType || 'poll');
  const [scope, setScope] = useState(poll?.classroomId ? 'classroom' : 'global');
  const [selectedClassrooms, setSelectedClassrooms] = useState(
    poll?.classroomId ? [poll.classroomId] : []
  );
  const [options, setOptions] = useState(poll?.options || ['', '']);
  const [status, setStatus] = useState(poll?.status || 'live');
  const [saving, setSaving] = useState(false);

  const isYesNo = pollType === 'yes_no';

  const handleSave = async () => {
    if (!question.trim()) { window.showToast('Please enter a question.', 'error'); return; }
    if (scope === 'classroom' && selectedClassrooms.length === 0) {
      window.showToast('Please select at least one classroom.', 'error'); return;
    }

    setSaving(true);
    try {
      const finalOptions = isYesNo ? ['Yes', 'No'] : options.filter(o => o.trim());
      const targets = scope === 'global' ? [null] : selectedClassrooms;

      for (const classroomId of targets) {
        const payload = {
          question,
          options: finalOptions,
          itemType: pollType,
          classroomId: classroomId,
          status,
          excludedStudentIds: [],
        };
        if (poll) {
          await updatePoll(poll.id, payload);
        } else {
          await createPoll(payload);
        }
      }

      window.showToast(poll ? 'Poll updated!' : `Poll created for ${targets.length} target(s)!`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      window.showToast(err.message || 'Failed to save poll.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateOption = (i, val) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  };

  const addOption = () => setOptions(o => [...o, '']);
  const removeOption = (i) => setOptions(o => o.filter((_, idx) => idx !== i));

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span>{poll ? 'Edit Poll' : 'Create New Poll'}</span>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.modalBody}>
          {/* Scope: Global or Classroom */}
          <div className={styles.scopeRow}>
            <button
              className={`${styles.scopeBtn} ${scope === 'global' ? styles.scopeActive : ''}`}
              onClick={() => setScope('global')}
            >
              <Globe size={16} /> Global Poll
              <span className={styles.scopeHint}>All classrooms</span>
            </button>
            <button
              className={`${styles.scopeBtn} ${scope === 'classroom' ? styles.scopeActive : ''}`}
              onClick={() => setScope('classroom')}
            >
              <School size={16} /> Classroom Poll
              <span className={styles.scopeHint}>Select specific classrooms</span>
            </button>
          </div>

          {/* Classroom picker */}
          {scope === 'classroom' && (
            <div className={styles.formGroup}>
              <label>Select Classrooms</label>
              <div className={styles.classroomGrid}>
                {classrooms.map(c => (
                  <label key={c.id} className={`${styles.classChip} ${selectedClassrooms.includes(c.id) ? styles.chipActive : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedClassrooms.includes(c.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedClassrooms(p => [...p, c.id]);
                        else setSelectedClassrooms(p => p.filter(id => id !== c.id));
                      }}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Poll Type */}
          <div className={styles.formGroup}>
            <label>Poll Type</label>
            <select className={styles.input} value={pollType} onChange={e => setPollType(e.target.value)}>
              {POLL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Question */}
          <div className={styles.formGroup}>
            <label>Question / Title</label>
            <textarea
              className={styles.input}
              rows={3}
              placeholder="Enter your question..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
          </div>

          {/* Options (not for Yes/No) */}
          {!isYesNo && (
            <div className={styles.formGroup}>
              <label>Options</label>
              {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <input
                    className={styles.input}
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                  />
                  {options.length > 2 && (
                    <button className={styles.removeOptBtn} onClick={() => removeOption(i)}><X size={14} /></button>
                  )}
                </div>
              ))}
              <button className={styles.addOptBtn} onClick={addOption}>+ Add Option</button>
            </div>
          )}

          {/* Status */}
          <div className={styles.formGroup}>
            <label>Status</label>
            <select className={styles.input} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="live">Live (Active)</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : poll ? 'Update Poll' : 'Create Poll'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPolls() {
  const currentUser = getCurrentUser();
  const [polls, setPolls] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterScope, setFilterScope] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editPoll, setEditPoll] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [summary, setSummary] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pollsData, classroomsData, summaryData] = await Promise.all([
        getStaffPolls(),
        getClassrooms(),
        getPollsResponsesSummary().catch(() => []),
      ]);
      setPolls((pollsData || []).sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0)));
      setClassrooms(classroomsData || []);
      setSummary(summaryData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredPolls = polls
    .filter(p => {
      if (filterScope === 'global') return !p.classroomId;
      if (filterScope === 'classroom') return !!p.classroomId;
      return true;
    })
    .filter(p => filterStatus === 'all' || p.status === filterStatus)
    .filter(p => !search || p.question?.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deletePoll(deleteTarget.id);
      if (res.archived) {
        window.showToast('Poll moved to Archive!', 'success');
      } else {
        window.showToast('Poll permanently deleted!', 'success');
      }
      setDeleteTarget(null);
      loadData();
    } catch {
      window.showToast('Failed to delete poll.', 'error');
    }
  };

  const stats = {
    total: polls.length,
    live: polls.filter(p => p.status === 'live').length,
    closed: polls.filter(p => p.status === 'closed').length,
    global: polls.filter(p => !p.classroomId).length,
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Poll Management</h2>
          <p className={styles.subtitle}>Create and manage global and classroom polls</p>
        </div>
        <button className={styles.createBtn} onClick={() => { setEditPoll(null); setShowModal(true); }}>
          <Plus size={17} /> Create Poll
        </button>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        {[
          { label: 'Total Polls', value: stats.total, icon: <BarChart3 size={20} />, color: '#5e6ad2' },
          { label: 'Live', value: stats.live, icon: <CheckCircle size={20} />, color: '#10b981' },
          { label: 'Closed', value: stats.closed, icon: <XCircle size={20} />, color: '#ef4444' },
          { label: 'Global', value: stats.global, icon: <Globe size={20} />, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: s.color, background: `${s.color}18` }}>{s.icon}</div>
            <div className={styles.statNum} style={{ color: s.color }}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div style={{ position: 'relative', flex: 2 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className={styles.filterInput}
            placeholder="Search polls..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.2rem' }}
          />
        </div>
        <select className={styles.filterInput} value={filterScope} onChange={e => setFilterScope(e.target.value)}>
          <option value="all">All Scopes</option>
          <option value="global">🌍 Global</option>
          <option value="classroom">🏫 Classroom</option>
        </select>
        <select className={styles.filterInput} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="live">Live</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Poll List */}
      {loading ? (
        <SkeletonLoader type="card" count={4} />
      ) : filteredPolls.length === 0 ? (
        <EmptyState
          icon="📊"
          title={search ? 'No polls found' : 'No polls created yet'}
          description={search ? 'Try clearing your search.' : 'Create your first global or classroom poll.'}
          actionLabel={search ? 'Clear Search' : 'Create Poll'}
          onAction={search ? () => setSearch('') : () => setShowModal(true)}
        />
      ) : (
        <div className={styles.pollGrid}>
          {filteredPolls.map(poll => {
            const pollSummary = summary.find(s => s.id === poll.id);
            const classroom = classrooms.find(c => c.id === poll.classroomId);
            const isGlobal = !poll.classroomId;
            return (
              <div key={poll.id} className={styles.pollCard}>
                <div className={styles.pollCardTop}>
                  <div className={styles.pollBadges}>
                    <span className={`${styles.badge} ${isGlobal ? styles.badgeGlobal : styles.badgeClassroom}`}>
                      {isGlobal ? '🌍 Global' : '🏫 ' + (classroom?.name || poll.classroomId)}
                    </span>
                    <span className={`${styles.badge} ${poll.status === 'live' ? styles.badgeLive : styles.badgeClosed}`}>
                      {poll.status === 'live' ? '● Live' : '○ Closed'}
                    </span>
                    <span className={`${styles.badge} ${styles.badgeType}`}>{poll.itemType || 'poll'}</span>
                  </div>
                  <div className={styles.pollCardActions}>
                    {poll.staffId === currentUser?.id && (
                      <>
                        <button className={styles.editBtn} onClick={() => { setEditPoll(poll); setShowModal(true); }} title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button className={styles.deleteBtn} onClick={() => setDeleteTarget(poll)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <h4 className={styles.pollQuestion}>{poll.question}</h4>
                {pollSummary && (
                  <div className={styles.pollStats}>
                    <div className={styles.pollStatItem}>
                      <span>{pollSummary.responsesCount}</span>
                      <label>Responses</label>
                    </div>
                    <div className={styles.pollStatItem}>
                      <span>{pollSummary.totalStudents}</span>
                      <label>Students</label>
                    </div>
                    <div className={styles.pollStatItem}>
                      <span style={{ color: pollSummary.totalStudents > 0 ? '#10b981' : 'var(--text-muted)' }}>
                        {pollSummary.totalStudents > 0
                          ? Math.round((pollSummary.responsesCount / pollSummary.totalStudents) * 100) + '%'
                          : '—'}
                      </span>
                      <label>Participation</label>
                    </div>
                  </div>
                )}
                <p className={styles.pollMeta}>{new Date(poll.createdAt || poll.created_at || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <PollModal
          poll={editPoll}
          classrooms={classrooms}
          onClose={() => { setShowModal(false); setEditPoll(null); }}
          onSuccess={loadData}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Poll"
        message={`Delete "${deleteTarget?.question}"? All responses will be permanently removed.`}
        confirmText="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
