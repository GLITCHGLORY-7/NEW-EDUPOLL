import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { login, logout } from '../services/api';
import styles from './Login.module.css';

export default function Login() {
  const [isStudent, setIsStudent] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.body.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    // If redirect contains student path, default UI tab to Student login
    if (redirectUrl && redirectUrl.includes('poll')) {
      setIsStudent(true);
    }
  }, [redirectUrl]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(loginId, password);
      
      if (isStudent && data.user.role === 'staff') {
        logout();
        throw new Error('Please use the Faculty / Admin tab to sign in.');
      }
      
      if (!isStudent && data.user.role !== 'staff') {
        logout();
        throw new Error('Please use the Student tab to sign in.');
      }

      if (data.user.role === 'staff') {
        const isStudentPath = redirectUrl && (redirectUrl.includes('/student') || redirectUrl.includes('/poll/'));
        const targetUrl = (redirectUrl && !isStudentPath) ? redirectUrl : '/';
        navigate(targetUrl);
      } else {
        const isStudentPath = redirectUrl && (redirectUrl.includes('/student') || redirectUrl.includes('/poll/'));
        const targetUrl = (redirectUrl && isStudentPath) ? redirectUrl : '/student';
        navigate(targetUrl);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    }
  };

  const selectTab = (studentMode) => {
    setIsStudent(studentMode);
    setLoginId('');
    setPassword('');
    setError('');
  };

  return (
    <div className={styles.container}>
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme} 
        style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', backgroundColor: 'var(--card-bg)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        title="Switch theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <form className={styles.card} onSubmit={handleLogin} autoComplete="off">
        
        {/* Title */}
        <div className={styles.header}>
           <h2 className={styles.title}>Welcome Back 👋</h2>
           <p className={styles.subtitle}>Sign in to your EDUPOLL account</p>
         </div>
        
        {/* Toggle tabs */}
        <div className={styles.tabsContainer}>
          <button 
            type="button" 
            className={`${styles.tab} ${!isStudent ? styles.activeTab : ''}`}
            onClick={() => selectTab(false)}
          >
            <span>🎓 Faculty / Admin</span>
          </button>
          <button 
            type="button" 
            className={`${styles.tab} ${isStudent ? styles.activeTab : ''}`}
            onClick={() => selectTab(true)}
          >
            <span>🎒 Student</span>
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        
        {/* SEC ID input */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            {isStudent ? "Student SEC ID" : "Admin SEC ID"}
          </label>
          <input 
            className={styles.input}
            type="text" 
            placeholder={isStudent ? "e.g. CS2024001" : "e.g. Your Admin ID"}
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            autoComplete="off"
            required
          />
        </div>

        {/* Password input */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <div className={styles.inputWrapper}>
            <input 
              className={styles.input}
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button 
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Sign In Button */}
        <button className={styles.button} type="submit">
          Sign In &rarr;
        </button>
        
        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerNote}>Contact your administrator to register</p>
        </div>
      </form>
    </div>
  );
}
