import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StaffLayout from './layouts/StaffLayout';
import Dashboard from './pages/Dashboard';
import Classrooms from './pages/Classrooms';
import Students from './pages/Students';
import Staff from './pages/Staff';
import Polls from './pages/Polls';
import Results from './pages/Results';
import Reports from './pages/Reports';
import QRLinks from './pages/QRLinks';
import Settings from './pages/Settings';
import Register from './pages/Register';
import Messages from './pages/Messages';
import Announcements from './pages/Announcements';
import AdminPolls from './pages/AdminPolls';
import Archive from './pages/Archive';
import StudentLayout from './layouts/StudentLayout';
import StudentActivePoll from './pages/StudentActivePoll';
import StudentMyPolls from './pages/StudentMyPolls';
import StudentHistory from './pages/StudentHistory';
import StudentProfile from './pages/StudentProfile';
import StudentSuccess from './pages/StudentSuccess';
import StudentMessages from './pages/StudentMessages';
import StudentAnnouncements from './pages/StudentAnnouncements';
import StudentDashboard from './pages/StudentDashboard';
import Login from './pages/Login';
import Toast from './components/Toast';
import './styles/index.css';

function App() {
  const [toast, setToast] = useState(null);

  // Register global toast function
  window.showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Staff / Admin Routes */}
          <Route path="/" element={<StaffLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="classrooms" element={<Classrooms />} />
            <Route path="students" element={<Students />} />
            <Route path="staff" element={<Staff />} />
            <Route path="polls" element={<Polls />} />
            <Route path="responses" element={<Results />} />
            <Route path="messages" element={<Messages />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="admin-polls" element={<AdminPolls />} />
            <Route path="reports" element={<Reports />} />
            <Route path="archive" element={<Archive />} />
            <Route path="qr-codes" element={<QRLinks />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Student Routes */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentDashboard />} />
            <Route path="polls" element={<StudentActivePoll />} />
            <Route path="success" element={<StudentSuccess />} />
            <Route path="my-polls" element={<StudentMyPolls />} />
            <Route path="history" element={<StudentHistory />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="messages" element={<StudentMessages />} />
            <Route path="announcements" element={<StudentAnnouncements />} />
          </Route>

          {/* Student QR Direct Route */}
          <Route path="/poll/:id" element={<StudentLayout />}>
            <Route index element={<StudentActivePoll />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </>
  );
}

export default App;
