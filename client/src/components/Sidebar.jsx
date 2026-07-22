import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, Waves, Activity, MessageSquare, LogOut, QrCode, Shield, MessageCircle, Sun, Moon, X, Megaphone, FileText, Settings, HelpCircle, BarChart3, Archive } from 'lucide-react';
import { getClassrooms, getCurrentUser, getMessagesUnreadCount, getAnnouncementsUnreadCount } from '../services/api';
import { getAppConfig } from '../config/appConfig';
import styles from './Sidebar.module.css';
import logo from '../assets/images/logo.png';

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [unreadAnn, setUnreadAnn] = useState(0);

  useEffect(() => {
    getClassrooms().then(data => {
      setClassrooms(data || []);
      if (data && data.length > 0) {
        setSelectedClassId(data[0].id);
      }
    }).catch(err => console.log('Sidebar class list failed', err));
  }, []);

  useEffect(() => {
    const fetchCounts = () => {
      getMessagesUnreadCount().then(data => setUnreadMsg(data.count || 0)).catch(() => {});
      getAnnouncementsUnreadCount().then(data => setUnreadAnn(data.count || 0)).catch(() => {});
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => clearInterval(interval);
  }, []);

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

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.id === 'SAIRAM';
  
  const config = getAppConfig();

  const navItems = isAdmin ? [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/classrooms', label: 'Classrooms', icon: Users },
    { path: '/staff', label: 'Staff Management', icon: Shield },
    { path: '/admin-polls', label: 'Poll Management', icon: BarChart3 },
    { path: '/messages', label: 'Messages', icon: MessageCircle },
    { path: '/announcements', label: 'Global Announcements', icon: Megaphone },
    { path: '/reports', label: 'Reports & Analytics', icon: FileText },
    { path: '/archive', label: 'Archive Management', icon: Archive },
    { path: '/settings', label: 'Settings', icon: Settings }
  ] : [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/classrooms', label: 'Classroom Details', icon: Users },
    { path: '/students', label: 'Student Management', icon: UserPlus },
    { path: '/polls', label: 'Polls & Activities', icon: Waves },
    { path: '/responses', label: 'Responses', icon: MessageSquare },
    { path: '/messages', label: 'Messages', icon: MessageCircle },
    { path: '/announcements', label: 'Announcements', icon: Megaphone },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/archive', label: 'Archived Polls', icon: Archive },
    { path: '/qr-codes', label: 'QR Codes', icon: QrCode },
    { path: '/settings', label: 'Settings', icon: Settings }
  ];

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <button className={styles.closeSidebarBtn} onClick={onClose} aria-label="Close sidebar">
        <X size={20} />
      </button>

      <div className={styles.logo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={logo} alt="EduPoll" style={{ height: '50px', objectFit: 'contain' }} onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="font-weight: 800; font-size: 1.5rem; letter-spacing: 0.1em; background: linear-gradient(135deg, #a78bfa, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">EDUPOLL</span>'; }} />
      </div>
      
      <nav className={styles.nav}>
        {navItems.map(item => {
          const Icon = item.icon;
          const showBadge = (item.path === '/messages' && unreadMsg > 0) || (item.path === '/announcements' && unreadAnn > 0);
          const badgeCount = item.path === '/messages' ? unreadMsg : unreadAnn;
          return (
            <NavLink 
              key={item.path}
              to={item.path} 
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <Icon size={18} className={styles.icon} />
                <span>{item.label}</span>
              </div>
              {showBadge && (
                <span className="badge badge-danger" style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}>
                  {badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={styles.footer}>
         {/* Help Center */}
         {config.supportEmail && (
           <a
             href={`mailto:${config.supportEmail}`}
             className={styles.helpBtn}
             title="Contact Support"
           >
             <HelpCircle size={15} />
             <span>Need Help? Contact Support</span>
           </a>
         )}
         <button className={styles.themeToggleBtn} onClick={toggleTheme} title="Switch theme">
           {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
           <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
         </button>
         <button className={styles.signOutBtn} onClick={handleSignOut}>
            <LogOut size={16} />
            <span>Sign Out</span>
         </button>
      </div>
    </aside>
  );
}
