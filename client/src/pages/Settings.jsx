import { useState } from 'react';
import { getCurrentUser, updateStaff } from '../services/api';
import { getAppConfig, saveAppConfig } from '../config/appConfig';
import { Building2, Mail, KeyRound, User, Save } from 'lucide-react';
import styles from './Settings.module.css';

export default function Settings() {
  const user = getCurrentUser() || {};
  const isAdmin = user.id === 'SAIRAM';
  const config = getAppConfig();

  const [name, setName] = useState(user.name || '');
  const [loginId, setLoginId] = useState(user.loginId || user.login_id || '');
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin-only config
  const [institutionName, setInstitutionName] = useState(config.institutionName || '');
  const [supportEmail, setSupportEmail] = useState(config.supportEmail || '');
  const [savingConfig, setSavingConfig] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const payload = { name, loginId, email };
      if (password.trim() !== '') {
        payload.password = password;
      }
      const updatedUser = await updateStaff(user.id, payload);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setPassword('');
      window.showToast("Settings saved successfully!", "success");
    } catch (err) {
      console.error(err);
      window.showToast("Failed to save settings.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveConfig = () => {
    setSavingConfig(true);
    saveAppConfig({ institutionName, supportEmail });
    setTimeout(() => {
      setSavingConfig(false);
      window.showToast("College settings saved!", "success");
    }, 400);
  };

  return (
    <div className={styles.container}>
      <h2>Settings</h2>

      {/* Profile Information */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <User size={18} />
          <h3>Profile Information</h3>
        </div>
        <div className={styles.formGroup}>
          <label>Name</label>
          <input type="text" className={styles.input} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className={styles.formGroup}>
          <label>Staff ID (Login ID)</label>
          <input type="text" className={styles.input} value={loginId} onChange={e => setLoginId(e.target.value)} />
        </div>
        <div className={styles.formGroup}>
           <label>Email</label>
           <input type="email" className={styles.input} value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        
        <div className={styles.cardHeader} style={{ marginTop: '2rem' }}>
          <KeyRound size={18} />
          <h3>Change Password</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Leave blank if you don't want to change your password.</p>
        <div className={styles.formGroup}>
           <label>New Password</label>
           <input type="password" placeholder="••••••••" className={styles.input} value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        <button className={styles.saveBtn} onClick={handleSave} disabled={isSubmitting}>
          <Save size={15} />
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Admin-only: College Configuration */}
      {isAdmin && (
        <div className={styles.card} style={{ marginTop: '1.5rem', border: '1px solid rgba(245,158,11,0.2)', background: 'linear-gradient(135deg, rgba(17,17,24,1) 0%, rgba(25,20,10,0.8) 100%)' }}>
          <div className={styles.cardHeader}>
            <Building2 size={18} style={{ color: '#f59e0b' }} />
            <h3 style={{ color: '#f59e0b' }}>College Configuration <span style={{ fontSize: '0.72rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '0.2rem 0.5rem', borderRadius: '6px', marginLeft: '0.5rem' }}>ADMIN ONLY</span></h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            These settings appear in PDF reports, sidebar help links, and the profile drawer.
          </p>
          <div className={styles.formGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={13} /> Institution Name
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., Sairam Engineering College"
              value={institutionName}
              onChange={e => setInstitutionName(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Shown in PDF report headers and profile drawer footer.
            </span>
          </div>
          <div className={styles.formGroup}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={13} /> Support Email
            </label>
            <input
              type="email"
              className={styles.input}
              placeholder="e.g., support@sairam.edu.in"
              value={supportEmail}
              onChange={e => setSupportEmail(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Clicking "Help Center" in the sidebar opens a mailto: link to this address.
            </span>
          </div>
          <button
            className={styles.saveBtn}
            onClick={handleSaveConfig}
            disabled={savingConfig}
            style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}
          >
            <Save size={15} />
            {savingConfig ? 'Saving...' : 'Save College Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
