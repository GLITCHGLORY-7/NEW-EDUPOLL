import { useState, useEffect } from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { getStudentResponses, deleteStudentResponseById } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border-color)',
  borderRadius: '0.875rem',
  padding: '1.25rem 1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  boxShadow: 'var(--shadow-sm)',
};

export default function StudentHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null); // id to delete
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const loadHistory = () => {
    setLoading(true);
    getStudentResponses({ history: true })
      .then(data => { setHistory(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => { loadHistory(); }, []);

  const handleDelete = async (id) => {
    try {
      await deleteStudentResponseById(id);
      if (window.showToast) window.showToast('History item cleared!', 'success');
      loadHistory();
    } catch(err) {
      console.error(err);
      if (window.showToast) window.showToast('Failed to clear item.', 'error');
    }
  };

  const handleClearAll = async () => {
    try {
      await Promise.all(history.map(item => deleteStudentResponseById(item.id)));
      if (window.showToast) window.showToast('All history cleared!', 'success');
      loadHistory();
    } catch(err) {
      console.error(err);
      if (window.showToast) window.showToast('Failed to clear history.', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '1.5rem', margin: 0 }}>Voting History</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {history.length} response{history.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setConfirmClearAll(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              fontFamily: 'inherit', transition: 'all 0.2s'
            }}
          >
            <Trash2 size={15} /> Clear All
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ ...card, alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading history...</p>
        </div>
      ) : history.length === 0 ? (
        <div style={{ ...card, alignItems: 'center', justifyContent: 'center', minHeight: '160px', gap: '1rem' }}>
          <Clock size={36} color="var(--primary)" style={{ opacity: 0.4 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>You haven't voted in any polls yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {history.map(item => (
            <div key={item.id} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ color: 'var(--text-main)', margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                  {item.pollId === 'GENERAL' ? 'General Q&A' : `Poll ID: ${item.pollId}`}
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{
                    background: 'rgba(94,106,210,0.12)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(94,106,210,0.2)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    SUBMITTED
                  </span>
                  <button
                    onClick={() => setConfirmDelete(item.id)}
                    title="Remove this entry"
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--danger)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', padding: '0.2rem',
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Your Answer: <strong style={{ color: 'var(--text-main)' }}>{item.answer}</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>
                Voted on: {new Date(item.submittedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Confirm single delete */}
      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { handleDelete(confirmDelete); setConfirmDelete(null); }}
        title="Remove History Item"
        message="Are you sure you want to remove this entry? This will also remove your vote from the poll."
        confirmText="Remove"
      />

      {/* Confirm clear all */}
      <ConfirmModal
        isOpen={confirmClearAll}
        onClose={() => setConfirmClearAll(false)}
        onConfirm={() => { handleClearAll(); setConfirmClearAll(false); }}
        title="Clear All History"
        message="This will permanently remove all your voting history and votes. This cannot be undone."
        confirmText="Clear All"
      />
    </div>
  );
}
