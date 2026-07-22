import { useState, useEffect, useRef } from 'react';
import { X, User, LogOut, Moon, Sun, Shield, Mail, Building2, ChevronRight, KeyRound } from 'lucide-react';
import { getCurrentUser, logout, updateStaff } from '../services/api';
import { getAppConfig } from '../config/appConfig';
import styles from './ProfileDrawer.module.css';

export default function ProfileDrawer({ onClose }) {
  const user = getCurrentUser() || {};
  const config = getAppConfig();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handleOutside), 100);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('light-theme', next === 'light');
    document.body.classList.toggle('light-theme', next === 'light');
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) return;
    setSaving(true);
    try {
      await updateStaff(user.id, { password: newPassword });
      window.showToast?.('Password updated successfully!', 'success');
      setNewPassword('');
      setShowPasswordForm(false);
    } catch {
      window.showToast?.('Failed to update password.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : (user.role === 'student' ? 'ST' : 'ST');

  const roleLabel = user.role === 'student' ? 'Student' : user.id === 'SAIRAM' ? 'Administrator' : 'Staff';
  const roleColor = user.id === 'SAIRAM' ? '#f59e0b' : user.role === 'student' ? '#10b981' : '#5e6ad2';

  return (
    <div className={styles.overlay}>
      <div className={styles.drawer} ref={drawerRef}>
        {/* Header */}
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>My Profile</span>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Avatar + Name Card */}
        <div className={styles.profileCard}>
          <div className={styles.avatarRing}>
            <div className={styles.avatar}>{initials}</div>
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{user.name || 'User'}</div>
            <div className={styles.roleBadge} style={{ background: `${roleColor}22`, color: roleColor }}>
              {user.id === 'SAIRAM' && <Shield size={12} />}
              {roleLabel}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className={styles.detailsSection}>
          {user.email && (
            <div className={styles.detailRow}>
              <Mail size={15} className={styles.detailIcon} />
              <div>
                <div className={styles.detailLabel}>Email</div>
                <div className={styles.detailValue}>{user.email}</div>
              </div>
            </div>
          )}
          {(() => {
            if (user.role === 'student' && user.classrooms && user.classrooms.length > 0) {
              return (
                <div className={styles.detailRow}>
                  <Building2 size={15} className={styles.detailIcon} />
                  <div>
                    <div className={styles.detailLabel}>Classrooms</div>
                    <div className={styles.detailValue}>{user.classrooms.map(c => c.name).join(', ')}</div>
                  </div>
                </div>
              );
            }
            if (user.department || user.position) {
              return (
                <div className={styles.detailRow}>
                  <Building2 size={15} className={styles.detailIcon} />
                  <div>
                    <div className={styles.detailLabel}>{user.role === 'student' ? 'Department' : 'Department'}</div>
                    <div className={styles.detailValue}>{user.department || user.position || '—'}</div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          {user.login_id && (
            <div className={styles.detailRow}>
              <User size={15} className={styles.detailIcon} />
              <div>
                <div className={styles.detailLabel}>Login ID</div>
                <div className={styles.detailValue}>{user.login_id}</div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actionsSection}>
          {/* Dark Mode Toggle */}
          <div className={styles.actionRow} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
            <div className={`${styles.toggle} ${theme === 'light' ? styles.toggleOn : ''}`}>
              <div className={styles.toggleThumb} />
            </div>
          </div>

          {/* Change Password — only for staff/admin */}
          {user.role !== 'student' && (
            <div className={styles.actionRow} onClick={() => setShowPasswordForm(p => !p)}>
              <KeyRound size={16} />
              <span>Change Password</span>
              <ChevronRight size={15} className={`${styles.chevron} ${showPasswordForm ? styles.chevronOpen : ''}`} />
            </div>
          )}

          {showPasswordForm && (
            <div className={styles.passwordForm}>
              <input
                type="password"
                className={styles.passwordInput}
                placeholder="New password..."
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <button className={styles.savePasswordBtn} onClick={handleChangePassword} disabled={saving}>
                {saving ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          )}
        </div>

        {/* Logout */}
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={16} />
          Sign Out
        </button>

        <div className={styles.drawerFooter}>
          {config.institutionName} · EduPoll
        </div>
      </div>
    </div>
  );
}
