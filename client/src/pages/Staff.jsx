import { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Loader, Pencil } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { getCurrentUser, getClassrooms } from '../services/api';
import styles from './Staff.module.css';

export default function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [editingStaffId, setEditingStaffId] = useState(null);

  const currentUser = getCurrentUser();

  // Quick manual add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLoginId, setNewLoginId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newGender, setNewGender] = useState('Male');
  const [newPosition, setNewPosition] = useState('');
  const [selectedClassrooms, setSelectedClassrooms] = useState([]);

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch staff list');
      const data = await res.json();
      setStaffList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    getClassrooms().then(data => setClassrooms(data || [])).catch(console.error);
  }, []);

  const handleEditClick = (staff) => {
    setEditingStaffId(staff.id);
    setNewName(staff.name || '');
    setNewEmail(staff.email || '');
    setNewLoginId(staff.login_id || '');
    setNewGender(staff.gender || 'Male');
    setNewPosition(staff.position || '');
    setSelectedClassrooms(staff.classroomIds || []);
    setNewPassword('');
    setShowAddForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    if (editingStaffId) {
      // Edit Mode
      try {
        const payload = { 
          name: newName, 
          email: newEmail, 
          loginId: newLoginId, 
          gender: newGender, 
          position: newPosition,
          classroomIds: selectedClassrooms 
        };
        if (newPassword && newPassword.trim() !== '') {
          payload.password = newPassword;
        }
        const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/staff/${editingStaffId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to update staff');
        }
        setShowAddForm(false);
        setEditingStaffId(null);
        setNewName('');
        setNewEmail('');
        setNewLoginId('');
        setNewPassword('');
        setNewPosition('');
        setSelectedClassrooms([]);
        fetchStaff();
        if (window.showToast) window.showToast('Staff member updated successfully!', 'success');
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
      }
    } else {
      // Add Mode
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            name: newName, 
            email: newEmail, 
            loginId: newLoginId, 
            password: newPassword, 
            gender: newGender, 
            position: newPosition,
            classroomIds: selectedClassrooms 
          })
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to register staff');
        }
        setShowAddForm(false);
        setNewName('');
        setNewEmail('');
        setNewLoginId('');
        setNewPassword('');
        setNewGender('Male');
        setNewPosition('');
        setSelectedClassrooms([]);
        fetchStaff();
        if (window.showToast) window.showToast('Staff member added successfully!', 'success');
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
      }
    }
  };

  const handleDeleteStaff = (staff) => {
    setStaffToDelete(staff);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/staff/${staffToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to delete staff');
      }
      setStaffList(staffList.filter(s => s.id !== staffToDelete.id));
      if (window.showToast) window.showToast('Staff removed successfully!', 'success');
    } catch (err) {
      if (window.showToast) window.showToast(err.message, 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setStaffToDelete(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Staff Management</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage faculty and administrators with system access.</p>
        </div>
        {currentUser?.id === 'SAIRAM' && (
          <button 
            onClick={() => {
              setEditingStaffId(null);
              setNewName('');
              setNewEmail('');
              setNewLoginId('');
              setNewPassword('');
              setNewGender('Male');
              setNewPosition('');
              setSelectedClassrooms([]);
              setShowAddForm(!showAddForm);
            }}
            style={{
              background: 'var(--accent)', color: '#fff', border: 'none', padding: '0.75rem 1rem', 
              borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
            }}
          >
            <Plus size={16} /> Add Staff
          </button>
        )}
      </div>

      {error && <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>{error}</div>}

      {showAddForm && (
        <form className="glass-panel animate-fade-up" onSubmit={handleFormSubmit} style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            {editingStaffId ? 'Edit Staff Member' : 'Register New Staff'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Full Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email Address</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Login ID (e.g. staff002)</label>
              <input type="text" value={newLoginId} onChange={e => setNewLoginId(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Password {editingStaffId && '(Leave blank to keep current)'}</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required={!editingStaffId} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gender *</label>
              <select value={newGender} onChange={e => setNewGender(e.target.value)} required style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Position</label>
              <input type="text" placeholder="e.g. Assistant Professor" value={newPosition} onChange={e => setNewPosition(e.target.value)} />
            </div>

            {/* Classroom Assignment Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Classroom Assignment (Select all that apply)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.75rem', background: 'var(--input-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                {classrooms.map(c => {
                  const isChecked = selectedClassrooms.includes(c.id);
                  return (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClassrooms(prev => [...prev, c.id]);
                          } else {
                            setSelectedClassrooms(prev => prev.filter(id => id !== c.id));
                          }
                        }}
                      />
                      {c.name}
                    </label>
                  );
                })}
                {classrooms.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No classrooms available. Please create a classroom first.</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" onClick={() => { setShowAddForm(false); setEditingStaffId(null); }} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
              {editingStaffId ? 'Update Staff Member' : 'Save Staff Member'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}><Loader style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} /></div>
      ) : (
        <div className={styles.staffGrid}>
          {staffList.map(staff => (
            <div key={staff.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(94, 106, 210, 0.2)', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent)' }}>
                    <Shield size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>{staff.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Staff</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {currentUser?.id === 'SAIRAM' && (
                    <>
                      <button 
                        onClick={() => handleEditClick(staff)}
                        title="Edit staff member"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#818cf8'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Pencil size={18} />
                      </button>
                      {staff.id !== currentUser?.id && staff.id !== 'SAIRAM' && (
                        <button 
                          onClick={() => handleDeleteStaff(staff)}
                          title="Remove staff"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <p style={{ margin: 0 }}><strong>Login ID:</strong> {staff.login_id}</p>
                <p style={{ margin: 0 }}><strong>Email:</strong> {staff.email || 'N/A'}</p>
                <p style={{ margin: 0 }}><strong>Gender:</strong> {staff.gender || 'Male'}</p>
                {staff.position && <p style={{ margin: 0 }}><strong>Position:</strong> {staff.position}</p>}
                
                {/* Classroom list display */}
                <div style={{ marginTop: '0.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                  <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-main)', fontSize: '0.8rem' }}>Assigned Classrooms:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {staff.classroomIds && staff.classroomIds.length > 0 ? (
                      staff.classroomIds.map(cId => {
                        const name = classrooms.find(c => c.id === cId)?.name || cId;
                        return (
                          <span key={cId} style={{ background: 'rgba(94, 106, 210, 0.15)', color: 'var(--accent)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600 }}>
                            {name}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>None</span>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <strong style={{ color: 'var(--text-main)' }}>Role:</strong> 
                  <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem' }}>{staff.role}</span>
                </div>
              </div>
            </div>
          ))}
          {staffList.length === 0 && !loading && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', width: '100%', gridColumn: '1 / -1' }}>No staff members found.</div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Remove Staff Member"
        message={`Are you sure you want to remove ${staffToDelete?.name} (${staffToDelete?.login_id})? They will no longer be able to log in or access the system.`}
        confirmText="Remove Staff"
        onClose={() => {
          setIsDeleteModalOpen(false);
          setStaffToDelete(null);
        }}
        onConfirm={confirmDeleteStaff}
      />
    </div>
  );
}
