import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Waves, Trash2, Pencil, Search, Filter } from 'lucide-react';
import { getStaffPolls, deletePoll, getClassrooms, getCurrentUser } from '../services/api';
import CreatePollModal from '../components/CreatePollModal';
import ConfirmModal from '../components/ConfirmModal';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import styles from './Polls.module.css';

export default function Polls() {
  const currentUser = getCurrentUser();
  const [polls, setPolls] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pollToEdit, setPollToEdit] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Reusable delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePollId, setDeletePollId] = useState('');
  const [deletePollQuestion, setDeletePollQuestion] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (location.state?.editPollId && polls.length > 0) {
      const poll = polls.find(p => p.id === location.state.editPollId);
      if (poll) {
        setPollToEdit(poll);
        setIsModalOpen(true);
      }
    }
  }, [location.state, polls]);

  const loadData = async () => {
    try {
      const [pollsData, classroomsData] = await Promise.all([
        getStaffPolls(),
        getClassrooms()
      ]);
      setPolls(pollsData);
      setClassrooms(classroomsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPolls = polls
    .filter(p => selectedClassroom === 'all' || p.classroomId === selectedClassroom)
    .filter(p => statusFilter === 'all' || p.status === statusFilter)
    .filter(p => !searchQuery || p.question?.toLowerCase().includes(searchQuery.toLowerCase()));

  const triggerDelete = (poll) => {
    setDeletePollId(poll.id);
    setDeletePollQuestion(poll.question);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteModalOpen(false);
    try {
      if (deletePollId === '__ALL__') {
        await Promise.all(filteredPolls.map(p => deletePoll(p.id)));
        window.showToast("All polls deleted successfully!", "success");
      } else {
        await deletePoll(deletePollId);
        window.showToast("Poll deleted successfully!", "success");
      }
      loadData();
    } catch (err) {
      console.error(err);
      window.showToast("Failed to delete poll.", "error");
    }
  };

  const handleEdit = (poll) => {
    setPollToEdit(poll);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setPollToEdit(null);
    setIsModalOpen(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Polls / Activities</h2>
          <p className={styles.subtitle}>{filteredPolls.length} items</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className={styles.primaryBtn} onClick={handleCreateNew}>
            + Create Poll / Activity
          </button>
          {filteredPolls.length > 0 && (
            <button 
              onClick={() => {
                setDeletePollId('__ALL__');
                setDeletePollQuestion('all polls');
                setIsDeleteModalOpen(true);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1.05rem', borderRadius: '0.5rem',
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                fontFamily: 'inherit', transition: 'all 0.2s'
              }}
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.searchBar}>
          {/* Search input */}
          <div style={{ position: 'relative', flex: 2, minWidth: '200px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search polls by question..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={styles.classroomSelect}
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <select
            value={selectedClassroom}
            onChange={e => setSelectedClassroom(e.target.value)}
            className={styles.classroomSelect}
          >
            <option value="all">All Classrooms</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={styles.classroomSelect}
            style={{ minWidth: '120px' }}
          >
            <option value="all">All Status</option>
            <option value="live">Live</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {loading ? (
          <SkeletonLoader type="card" count={4} />
        ) : filteredPolls.length === 0 ? (
          <EmptyState
            icon="🗳️"
            title={searchQuery ? 'No polls match your search' : 'No polls yet'}
            description={searchQuery ? `Try a different search term or filter.` : 'Create your first poll using the button above.'}
            actionLabel={searchQuery ? 'Clear Search' : '+ Create Poll'}
            onAction={searchQuery ? () => setSearchQuery('') : handleCreateNew}
          />
        ) : (
          <div className={styles.grid}>
            {filteredPolls.map(p => (
              <div key={p.id} className={styles.itemCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: p.itemType === 'activity' ? 'rgba(16,185,129,0.15)' : 'rgba(92,103,255,0.15)',
                        color: p.itemType === 'activity' ? '#10b981' : '#818cf8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {p.itemType === 'activity' ? 'Activity' : 'Poll'}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: p.status === 'live' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: p.status === 'live' ? '#10b981' : '#ef4444',
                      }}>
                        {p.status}
                      </span>
                    </div>
                    <h4 style={{ marginTop: '0.25rem' }}>{p.question}</h4>
                  </div>
                  {p.staffId === currentUser?.id && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
                      <button
                         onClick={() => handleEdit(p)}
                         style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
                      >
                         <Pencil size={16} />
                      </button>
                      <button
                         onClick={() => triggerDelete(p)}
                         style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                         <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  📚 {classrooms.find(c => c.id === p.classroomId)?.name || p.classroomId}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreatePollModal 
        isOpen={isModalOpen}
        pollToEdit={pollToEdit}
        onClose={() => {
          setIsModalOpen(false);
          setPollToEdit(null);
        }} 
        onSuccess={loadData}
      />

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title={deletePollId === '__ALL__' ? "Clear All Polls" : "Delete Poll"}
        message={deletePollId === '__ALL__'
          ? "Are you sure you want to delete all filtered polls? All submitted responses will be permanently deleted."
          : `Are you sure you want to delete the poll "${deletePollQuestion}"? All responses submitted for this poll will be permanently erased.`
        }
        confirmText={deletePollId === '__ALL__' ? "Clear All" : "Delete Poll"}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
