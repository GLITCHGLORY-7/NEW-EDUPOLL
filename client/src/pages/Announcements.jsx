import { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Edit2, Pin, Globe, BookOpen, X, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  getAnnouncements, createAnnouncement, updateAnnouncement, 
  deleteAnnouncement, markAnnouncementRead, getCurrentUser, getClassrooms 
} from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import styles from './Announcements.module.css';

function timeFormat(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { 
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

function AnnouncementCard({ ann, currentUser, onEdit, onDelete, onRead }) {
  const [expanded, setExpanded] = useState(false);
  const isOwner = ann.author_id === currentUser.id || currentUser.id === 'SAIRAM';

  useEffect(() => {
    if (!ann.is_read) {
      markAnnouncementRead(ann.id).catch(() => {});
      onRead(ann.id);
    }
  }, [ann.id]);

  return (
    <div className={`${styles.card} ${ann.is_pinned ? styles.cardPinned : ''} ${!ann.is_read ? styles.cardUnread : ''}`}>
      <div className={styles.cardHeader}>
        <div className={styles.cardMeta}>
          {ann.is_pinned && <span className={styles.pinBadge}><Pin size={11} /> Pinned</span>}
          {ann.is_global && <span className={styles.globalBadge}><Globe size={11} /> Global</span>}
          {ann.classroom_id && !ann.is_global && (
            <span className={styles.classroomBadge}><BookOpen size={11} /> {ann.classroom_id}</span>
          )}
          {!ann.is_read && <span className={styles.unreadDot} />}
        </div>
        <div className={styles.cardActions}>
          {isOwner && (
            <>
              <button className={styles.iconBtn} title="Edit" onClick={() => onEdit(ann)}>
                <Edit2 size={14} />
              </button>
              <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="Delete" onClick={() => onDelete(ann)}>
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
      <h3 className={styles.cardTitle}>{ann.title}</h3>
      <p className={`${styles.cardBody} ${expanded ? styles.cardBodyExpanded : ''}`}>{ann.body}</p>
      {ann.body.length > 150 && (
        <button className={styles.expandBtn} onClick={() => setExpanded(e => !e)}>
          {expanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Read more</>}
        </button>
      )}
      <div className={styles.cardFooter}>
        <div className={styles.authorInfo}>
          <div className={styles.authorAvatar}>{ann.author_name?.[0] || 'S'}</div>
          <div>
            <div className={styles.authorName}>{ann.author_name}</div>
            {ann.author_position && <div className={styles.authorPos}>{ann.author_position}</div>}
          </div>
        </div>
        <span className={styles.cardDate}>{timeFormat(ann.created_at)}</span>
      </div>
    </div>
  );
}

function CreateModal({ classrooms, onSave, onClose, editData }) {
  const [title, setTitle] = useState(editData?.title || '');
  const [body, setBody] = useState(editData?.body || '');
  const [classroomId, setClassroomId] = useState(editData?.classroom_id || (classrooms[0]?.id || ''));
  const [isPinned, setIsPinned] = useState(editData?.is_pinned || false);
  const [isGlobal, setIsGlobal] = useState(editData?.is_global || false);
  const [saving, setSaving] = useState(false);
  const user = getCurrentUser();
  const isAdmin = user.id === 'SAIRAM';

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await onSave({ title, body, classroomId: isGlobal ? null : classroomId, isPinned, isGlobal });
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{editData ? 'Edit Announcement' : 'New Announcement'}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title..." />
          </div>
          <div className={styles.formGroup}>
            <label>Message *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement..." rows={4} />
          </div>
          {!isGlobal && !editData && (
            <div className={styles.formGroup}>
              <label>Classroom</label>
              <select value={classroomId} onChange={e => setClassroomId(e.target.value)}>
                {classrooms.map(c => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
              </select>
            </div>
          )}
          <div className={styles.checkboxRow}>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} />
              <Pin size={14} /> Pin this announcement
            </label>
            {isAdmin && (
              <label className={styles.checkbox}>
                <input type="checkbox" checked={isGlobal} onChange={e => setIsGlobal(e.target.checked)} />
                <Globe size={14} /> Send globally (all classrooms)
              </label>
            )}
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !title.trim() || !body.trim()}>
            {saving ? 'Saving...' : (editData ? 'Update' : 'Post Announcement')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [undoTimers, setUndoTimers] = useState({});
  const user = getCurrentUser();

  const fetchData = async () => {
    try {
      const [anns, cls] = await Promise.all([getAnnouncements(), getClassrooms()]);
      setAnnouncements(anns);
      setClassrooms(cls);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (data) => {
    if (editData) {
      const updated = await updateAnnouncement(editData.id, data);
      setAnnouncements(prev => prev.map(a => a.id === editData.id ? { ...a, ...updated } : a));
      setEditData(null);
    } else {
      const created = await createAnnouncement(data);
      setAnnouncements(prev => [created, ...prev]);
      setEditData(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAnnouncement(deleteTarget.id);
      setAnnouncements(prev => prev.filter(a => a.id !== deleteTarget.id));
      window.showToast?.('Announcement deleted', 'success');
    } catch { window.showToast?.('Failed to delete', 'error'); }
    setDeleteTarget(null);
  };

  const handleRead = (id) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  };

  const pinned = announcements.filter(a => a.is_pinned);
  const regular = announcements.filter(a => !a.is_pinned);
  const unreadCount = announcements.filter(a => !a.is_read).length;

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <Megaphone size={24} /> Announcements
            {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount} new</span>}
          </h1>
          <p className={styles.pageSubtitle}>Post and manage classroom announcements</p>
        </div>
        <button className={styles.createBtn} onClick={() => { setEditData(null); setShowCreate(true); }}>
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {loading && (
        <div className={styles.loadingGrid}>
          {[1,2,3].map(i => <div key={i} className={styles.skeletonCard} />)}
        </div>
      )}

      {!loading && announcements.length === 0 && (
        <div className={styles.emptyState}>
          <Megaphone size={48} style={{ opacity: 0.2 }} />
          <h3>No announcements yet</h3>
          <p>Be the first to post an announcement for your classroom</p>
          <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Post First Announcement
          </button>
        </div>
      )}

      {pinned.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}><Pin size={14} /> Pinned</h2>
          <div className={styles.grid}>
            {pinned.map(ann => (
              <AnnouncementCard key={ann.id} ann={ann} currentUser={user}
                onEdit={a => { setEditData(a); setShowCreate(true); }}
                onDelete={setDeleteTarget} onRead={handleRead} />
            ))}
          </div>
        </section>
      )}

      {regular.length > 0 && (
        <section className={styles.section}>
          {pinned.length > 0 && <h2 className={styles.sectionTitle}>Recent</h2>}
          <div className={styles.grid}>
            {regular.map(ann => (
              <AnnouncementCard key={ann.id} ann={ann} currentUser={user}
                onEdit={a => { setEditData(a); setShowCreate(true); }}
                onDelete={setDeleteTarget} onRead={handleRead} />
            ))}
          </div>
        </section>
      )}

      {showCreate && (
        <CreateModal
          classrooms={classrooms}
          editData={editData}
          onSave={handleSave}
          onClose={() => { setShowCreate(false); setEditData(null); }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Announcement"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
