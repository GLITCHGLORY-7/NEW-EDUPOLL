import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { Menu, Waves, CheckSquare, Clock, User, LogOut, X, MessageSquare, Sun, Moon, LayoutDashboard, Megaphone, HelpCircle } from 'lucide-react';
import { getCurrentUser, logout, getStudentProfile } from '../services/api';
import NotificationCenter from '../components/NotificationCenter';
import ProfileDrawer from '../components/ProfileDrawer';
import { getAppConfig } from '../config/appConfig';
import styles from './StudentLayout.module.css';
import logo from '../assets/images/logo.png';

export default function StudentLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();

  // Apply theme on change
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
    if (!user || user.role !== 'student') {
      navigate('/login');
      return;
    }
    // Sync student details from backend
    getStudentProfile()
      .then(profile => {
        localStorage.setItem('user', JSON.stringify(profile));
      })
      .catch(console.error);
  }, [user, navigate]);

  if (!user) return null;

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : 'ST';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const config = getAppConfig();

  const navItems = [
    { path: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { path: '/student/polls', label: 'Active Polls', icon: Waves, end: false },
    { path: '/student/my-polls', label: 'My Polls', icon: CheckSquare, end: false },
    { path: '/student/messages', label: 'Messages', icon: MessageSquare, end: false },
    { path: '/student/announcements', label: 'Announcements', icon: Megaphone, end: false },
    { path: '/student/history', label: 'History', icon: Clock, end: false },
    { path: '/student/profile', label: 'Profile', icon: User, end: false },
  ];

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      {isSidebarOpen && <div className={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)} />}
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <img src={logo} alt="EduPoll" style={{ height: '36px', objectFit: 'contain' }} onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="font-weight: 800; font-size: 1.25rem; letter-spacing: 0.1em; background: linear-gradient(135deg, #a78bfa, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">EDUPOLL</span>'; }} />
          <button className={styles.closeBtn} onClick={() => setIsSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav className={styles.sidebarNav}>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `${styles.sidebarItem} ${isActive ? styles.activeItem : ''}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          {/* Help Center */}
          {config.supportEmail && (
            <a
              href={`mailto:${config.supportEmail}`}
              className={styles.helpBtn}
              title="Contact Support"
            >
              <HelpCircle size={14} />
              <span>Contact Support</span>
            </a>
          )}
          <button className={styles.themeToggleBtn} onClick={toggleTheme} title="Switch theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button className={styles.signOutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className={styles.mainContentWrapper}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.menuBrand}>
            <Menu
              className={styles.menuIcon}
              size={22}
              onClick={() => setIsSidebarOpen(true)}
            />
            <img src={logo} alt="EduPoll" style={{ height: '32px', objectFit: 'contain' }} onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span class="brand-fallback" style="font-weight: 800; font-size: 1.25rem; letter-spacing: 0.1em; background: linear-gradient(135deg, #a78bfa, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">EDUPOLL</span>'; }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Notification Center */}
            <NotificationCenter />

            {/* User profile → opens Profile Drawer */}
            <div className={styles.userProfile} onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userId}>{user.id}</span>
              </div>
              <div className={styles.avatar}>
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className={styles.mainContent}>
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className={styles.bottomNav}>
        {[
          { path: '/student', label: 'Home', icon: LayoutDashboard, end: true },
          { path: '/student/polls', label: 'Polls', icon: Waves, end: false },
          { path: '/student/messages', label: 'Chat', icon: MessageSquare, end: false },
          { path: '/student/announcements', label: 'Alerts', icon: Megaphone, end: false },
          { path: '/student/profile', label: 'Profile', icon: User, end: false },
        ].map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `${styles.bottomNavItem} ${isActive ? styles.bottomActiveItem : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Profile Drawer */}
      {showProfile && <ProfileDrawer onClose={() => setShowProfile(false)} />}
    </div>
  );
}
