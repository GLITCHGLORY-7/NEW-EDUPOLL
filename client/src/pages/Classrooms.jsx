import { useState, useEffect } from 'react';
import { Search, School, Trash2, Pencil, UserMinus, QrCode } from 'lucide-react';
import { getClassrooms, getStudents, getStaffPolls, deleteClassroom, updateStudent, getCurrentUser } from '../services/api';
import CreateClassroomModal from '../components/CreateClassroomModal';
import AssignStudentModal from '../components/AssignStudentModal';
import ConfirmModal from '../components/ConfirmModal';
import ShareClassroomModal from '../components/ShareClassroomModal';
import styles from './Classrooms.module.css';

export default function Classrooms() {
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [polls, setPolls] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);
  const [classroomToEdit, setClassroomToEdit] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeClassroom, setActiveClassroom] = useState(null);
  
  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [classroomToShare, setClassroomToShare] = useState(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(''); // 'classroom' or 'student'
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleteTargetName, setDeleteTargetName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [classroomsData, studentsData, pollsData] = await Promise.all([
        getClassrooms(),
        getStudents(),
        getStaffPolls()
      ]);
      setClassrooms(classroomsData);
      setStudents(studentsData);
      setPolls(pollsData);

      const token = localStorage.getItem('token');
      const staffRes = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaffList(staffData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerDeleteClassroom = (classroom) => {
    setDeleteType('classroom');
    setDeleteTargetId(classroom.id);
    setDeleteTargetName(classroom.name);
    setIsDeleteModalOpen(true);
  };

  const triggerDeassignStudent = (student) => {
    setDeleteType('student');
    setDeleteTargetId(student.id);
    setDeleteTargetName(student.name);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteModalOpen(false);
    try {
      if (deleteType === 'classroom') {
        await deleteClassroom(deleteTargetId);
        window.showToast("Classroom deleted successfully!", "success");
      } else {
        await updateStudent(deleteTargetId, { classroomId: '' });
        window.showToast("Student removed from classroom successfully!", "success");
      }
      loadData();
    } catch (err) {
      console.error(err);
      window.showToast(deleteType === 'classroom' ? "Failed to delete classroom." : "Failed to remove student from classroom.", "error");
    }
  };

  const handleAssignStudentClick = (classroom) => {
    setActiveClassroom(classroom);
    setIsAssignModalOpen(true);
  };

  const handleEditClassroom = (classroom) => {
    setClassroomToEdit(classroom);
    setIsClassroomModalOpen(true);
  };

  const handleShareClassroom = (classroom) => {
    setClassroomToShare(classroom);
    setIsShareModalOpen(true);
  };

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.id === 'SAIRAM';

  const filtered = classrooms.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Classrooms</h2>
          <p className={styles.subtitle}>{classrooms.length} total classrooms</p>
        </div>
        {isAdmin && (
          <button className={styles.primaryBtn} onClick={() => setIsClassroomModalOpen(true)}>
            + New Classroom
          </button>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.searchBar}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search classrooms..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.iconWrapper}>
               <School size={48} className={styles.emptyIcon} />
            </div>
            <h3>No classrooms found</h3>
            <p>Create your first classroom to get started</p>
          </div>
        ) : (
          <div className={styles.classroomGrid}>
            {filtered.map(c => {
              const classroomStudents = students.filter(s => s.classroomId === c.id);
              const activePoll = polls.find(p => p.classroomId === c.id && p.status === 'live');
              const initials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

              return (
                <div key={c.id} className={styles.classroomCard}>
                  {/* Title Bar */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleBlock}>
                      <span className={styles.pollIcon}>📊</span>
                      <h3 className={styles.cardTitle}>{c.name}</h3>
                    </div>
                    <div className={styles.cardActions}>
                      <span className={styles.studentCountBadge}>{classroomStudents.length}</span>
                      {isAdmin && (
                        <button className={styles.editBtn} onClick={() => handleEditClassroom(c)}>
                          <Pencil size={14} />
                        </button>
                      )}
                      <button className={styles.editBtn} onClick={() => handleShareClassroom(c)}>
                        <QrCode size={14} />
                      </button>
                      {isAdmin && (
                        <button className={styles.deleteBtn} onClick={() => triggerDeleteClassroom(c)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subtitle / Code Block */}
                  <div className={styles.codeBlock}>
                    <span className={styles.classroomCode}>{c.code || "E2106"}</span>
                    {(() => {
                      const classroomStaff = staffList.filter(s => s.classroomIds && s.classroomIds.includes(c.id));
                      if (classroomStaff.length > 0) {
                        return (
                          <span style={{ color: '#ec4899', fontSize: '0.75rem', fontWeight: '600' }}>
                            • Staff: {classroomStaff.map(s => s.name).join(', ')}
                          </span>
                        );
                      }
                      return c.staffName ? (
                        <span style={{ color: '#ec4899', fontSize: '0.75rem', fontWeight: '600' }}>
                          • Staff: {c.staffName}
                        </span>
                      ) : null;
                    })()}
                    <span className={styles.votedBadge}>0/{classroomStudents.length} Voted</span>
                  </div>

                  {/* Active Poll */}
                  <div className={styles.activePollSection}>
                    <p className={styles.activePollLabel}>
                      Active Poll: {activePoll ? activePoll.question : 'No active poll'}
                    </p>
                  </div>

                  {/* Student List */}
                  <div className={styles.studentListSection}>
                    {classroomStudents.length === 0 ? (
                      <p className={styles.noStudentsText}>No students assigned</p>
                    ) : (
                      <div className={styles.studentList}>
                        {classroomStudents.map(student => (
                          <div key={student.id} className={styles.studentRow}>
                            <div className={styles.studentInfo}>
                              <div className={styles.avatar}>
                                {initials(student.name)}
                              </div>
                              <div>
                                <p className={styles.studentName}>{student.name}</p>
                                <p className={styles.studentSecId}>{student.id}</p>
                              </div>
                            </div>
                            <div className={styles.studentActions}>
                              <span className={styles.pendingBadge}>Pending</span>
                              {!isAdmin && (
                                <button className={styles.deassignBtn} onClick={() => triggerDeassignStudent(student)}>
                                  <UserMinus size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Assign Button */}
                  {!isAdmin && (
                    <button className={styles.assignStudentBtn} onClick={() => handleAssignStudentClick(c)}>
                       + Assign Student
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Classroom Creation Modal */}
      <CreateClassroomModal 
        isOpen={isClassroomModalOpen} 
        classroomToEdit={classroomToEdit}
        onClose={() => {
          setIsClassroomModalOpen(false);
          setClassroomToEdit(null);
        }} 
        onSuccess={loadData} 
      />

      {/* Reusable Delete Modal */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title={deleteType === 'classroom' ? "Delete Classroom" : "Remove Student from Class"}
        message={deleteType === 'classroom' 
          ? `Are you sure you want to delete classroom "${deleteTargetName}"? All assigned students will become unassigned.`
          : `Are you sure you want to remove student "${deleteTargetName}" from this classroom? The student's profile will NOT be deleted.`
        }
        confirmText={deleteType === 'classroom' ? "Delete Classroom" : "Remove Student"}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* Reusable Assign Modal */}
      {isAssignModalOpen && activeClassroom && (
        <AssignStudentModal 
          isOpen={isAssignModalOpen}
          classroomId={activeClassroom.id}
          classroomName={activeClassroom.name}
          onClose={() => {
            setIsAssignModalOpen(false);
            setActiveClassroom(null);
          }} 
          onSuccess={loadData}
        />
      )}

      {/* Share Classroom Modal */}
      <ShareClassroomModal
        isOpen={isShareModalOpen}
        classroom={classroomToShare}
        onClose={() => {
          setIsShareModalOpen(false);
          setClassroomToShare(null);
        }}
      />
    </div>
  );
}
