import { useEffect, useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationCenter from '../components/NotificationCenter';
import ProfileDrawer from '../components/ProfileDrawer';
import { getCurrentUser } from '../services/api';
import { Menu } from 'lucide-react';
import { getAppConfig } from '../config/appConfig';
import styles from './StaffLayout.module.css';

export default function StaffLayout() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'staff') {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'ST';
  const config = getAppConfig();

  return (
    <div className={styles.layout}>
      {isSidebarOpen && <div className={styles.backdrop} onClick={() => setIsSidebarOpen(false)} />}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className={styles.mainContent}>
        {/* Topbar */}
        <div className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setIsSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <h2 className={styles.pageTitle}>{config.institutionName || 'EduPoll'}</h2>
          <div className={styles.userProfile}>
            {/* Notification Center */}
            <NotificationCenter />

            {/* Profile Avatar → opens Profile Drawer */}
            <div className={styles.avatar} onClick={() => setShowProfile(true)} title="View Profile">
              {initials}
            </div>
            <div className={styles.userInfo} onClick={() => setShowProfile(true)} style={{ cursor: 'pointer' }}>
              <span className={styles.userName}>{user.name?.split(' ')[0]}</span>
              <span className={styles.userRole}>{user.id === 'SAIRAM' ? 'Admin' : 'Staff'}</span>
            </div>
          </div>
        </div>

        <main className={styles.contentArea}>
          <Outlet />
        </main>
      </div>

      {/* Profile Drawer */}
      {showProfile && <ProfileDrawer onClose={() => setShowProfile(false)} />}
    </div>
  );
}
