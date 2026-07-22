import { AlertTriangle, Trash2 } from 'lucide-react';

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.65)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 99999,
  padding: '1rem',
};

const modalStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border-color)',
  borderRadius: '1rem',
  width: '100%',
  maxWidth: '400px',
  padding: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
};

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, isDanger }) {
  if (!isOpen) return null;
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
            background: isDanger !== false ? 'rgba(239,68,68,0.12)' : 'rgba(94,106,210,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {isDanger !== false
              ? <Trash2 size={20} color="#ef4444" />
              : <AlertTriangle size={20} color="#f59e0b" />}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              {title || 'Confirm Action'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
              {message || 'Are you sure you want to proceed? This action cannot be undone.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'var(--surface-hover)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.5rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); }}
            style={{
              padding: '0.625rem 1.5rem',
              background: isDanger !== false
                ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                : 'linear-gradient(135deg, var(--primary), #8b5cf6)',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
