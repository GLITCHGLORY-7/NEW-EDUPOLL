import { useState, useEffect } from 'react';
import { Search, Users, Trash2, Pencil, Filter } from 'lucide-react';
import { getStudents, deleteStudent, getClassrooms } from '../services/api';
import CreateStudentModal from '../components/CreateStudentModal';
import ConfirmModal from '../components/ConfirmModal';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import styles from './Students.module.css';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);

  // Custom Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleteTargetName, setDeleteTargetName] = useState('');
  const [deleteTargetClassroom, setDeleteTargetClassroom] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const [studentsData, classroomsData] = await Promise.all([
        getStudents(),
        getClassrooms()
      ]);
      setStudents(studentsData);
      setClassrooms(classroomsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerDeleteStudent = (student) => {
    setDeleteTargetId(student.id);
    setDeleteTargetName(student.name);
    setDeleteTargetClassroom(student.classroomId || '');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteModalOpen(false);
    try {
      await deleteStudent(deleteTargetId, deleteTargetClassroom);
      window.showToast("Student profile deleted permanently!", "success");
      loadStudents();
    } catch (err) {
      console.error(err);
      window.showToast("Failed to delete student.", "error");
    }
  };

  const handleEditStudent = (student) => {
    setStudentToEdit(student);
    setIsModalOpen(true);
  };

  const handleRegisterNew = () => {
    setStudentToEdit(null);
    setIsModalOpen(true);
  };

  const filtered = students
    .filter(s => selectedClassroom === 'all' || s.classroomId === selectedClassroom)
    .filter(s =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      (s.gender || '').toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Students</h2>
          <p className={styles.subtitle}>{students.length} registered students</p>
        </div>
        <button className={styles.primaryBtn} onClick={handleRegisterNew}>
          + Register Student
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.searchBar}>
          {/* Step 1: Classroom filter */}
          <div style={{ position: 'relative', minWidth: '160px' }}>
            <Filter size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select
              value={selectedClassroom}
              onChange={e => { setSelectedClassroom(e.target.value); setSearch(''); }}
              className={styles.searchInput}
              style={{ paddingLeft: '2.2rem', cursor: 'pointer' }}
            >
              <option value="all">All Classrooms</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {/* Step 2: Name / ID search */}
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search by name, SEC ID, gender..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {loading ? (
          <SkeletonLoader type="row" count={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="👥"
            title={search ? 'No students match your search' : selectedClassroom !== 'all' ? 'No students in this classroom' : 'No students registered yet'}
            description={search ? 'Try a different name or SEC ID.' : 'Register your first student using the button above.'}
            actionLabel={search ? 'Clear Search' : '+ Register Student'}
            onAction={search ? () => setSearch('') : handleRegisterNew}
          />
        ) : (
          <div className={styles.grid}>
            {filtered.map(s => (
              <div key={s.id} className={styles.itemCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4>{s.name}</h4>
                    <p>ID: {s.id}</p>
                    <p>Gender: {s.gender || 'Male'}</p>
                    <p>Classroom: {s.classroomId ? (classrooms.find(c => c.id === s.classroomId)?.name || s.classroomId) : 'No Classroom'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleEditStudent(s)}
                      style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => triggerDeleteStudent(s)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateStudentModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setStudentToEdit(null);
        }} 
        onSuccess={loadStudents}
        studentToEdit={studentToEdit}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Student"
        message={`Delete "${deleteTargetName}"? This will permanently remove their credentials and all voting history.`}
        confirmText="Delete Student"
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
