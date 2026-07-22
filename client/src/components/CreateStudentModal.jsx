import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createStudent, updateStudent, getClassrooms } from '../services/api';
import styles from './CreatePollModal.module.css';

export default function CreateStudentModal({ isOpen, onClose, onSuccess, initialClassroomId, studentToEdit }) {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [section, setSection] = useState('');
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [gender, setGender] = useState('Male');
  const [degree, setDegree] = useState('');

  useEffect(() => {
    if (isOpen) {
      getClassrooms().then(data => {
        setClassrooms(data);
        if (studentToEdit) {
          setSelectedClassroom(studentToEdit.classroomId || 'none');
        } else if (initialClassroomId) {
          setSelectedClassroom(initialClassroomId);
        } else if (data.length > 0) {
          setSelectedClassroom(data[0].id);
        }
      }).catch(console.error);

      if (studentToEdit) {
        setName(studentToEdit.name || '');
        setId(studentToEdit.id || '');
        setPassword(''); // Leave blank unless changing
        setDepartment(studentToEdit.department || '');
        setYear(studentToEdit.year || '');
        setSection(studentToEdit.section || '');
        setGender(studentToEdit.gender || 'Male');
        setDegree(studentToEdit.degree || '');
      } else {
        // reset form
        setName('');
        setId('');
        setPassword('');
        setDepartment('');
        setYear('');
        setSection('');
        setGender('Male');
        setDegree('');
      }
    }
  }, [isOpen, initialClassroomId, studentToEdit]);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !id || (!studentToEdit && !password)) {
      window.showToast("Please fill out all required fields.", "error");
      return;
    }
    try {
      const payload = {
        id,
        name,
        department,
        year,
        section,
        classroomId: selectedClassroom === 'none' ? '' : selectedClassroom,
        gender,
        degree
      };
      if (password) {
        payload.password = password;
      }

      if (studentToEdit) {
        payload.oldClassroomId = studentToEdit.classroomId || '';
        await updateStudent(studentToEdit.id, payload);
        window.showToast("Student profile updated successfully!", "success");
      } else {
        await createStudent(payload);
        window.showToast("Student registered successfully!", "success");
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      // Show the real error message from the server if available
      const errMsg = err?.message || '';
      window.showToast(errMsg || (studentToEdit ? "Failed to update student profile." : "Failed to register student."), "error");
    }
  };

  return (
    <div className={styles.overlay}>
      <form className={styles.modal} onSubmit={handleCreate} autoComplete="off">
        <div className={styles.header}>
          <h2 className={styles.title}>{studentToEdit ? 'Edit Student Profile' : 'Register Student'}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className={styles.body}>
          <div className={styles.formGroup}>
            <label>Full Name *</label>
            <input 
              type="text" 
              className={styles.input} 
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label>Degree</label>
              <input 
                type="text" 
                placeholder="e.g. B.Tech, M.Tech" 
                className={styles.input} 
                value={degree}
                onChange={e => setDegree(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Department</label>
              <input 
                type="text" 
                placeholder="e.g. IT, CSE" 
                className={styles.input} 
                value={department}
                onChange={e => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label>SEC ID *</label>
              <input 
                type="text" 
                placeholder="e.g. CS2024001" 
                className={styles.input} 
                value={id}
                onChange={e => setId(e.target.value)}
                required
                disabled={!!studentToEdit}
                autoComplete="off"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Password {studentToEdit ? '(Cannot be changed)' : '*'}</label>
              <input 
                type="password" 
                placeholder={studentToEdit ? '••••••••' : 'Password'} 
                className={styles.input} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required={!studentToEdit}
                disabled={!!studentToEdit}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label>Year</label>
              <input 
                type="text" 
                placeholder="e.g. 2nd Year" 
                className={styles.input} 
                value={year}
                onChange={e => setYear(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Section</label>
              <input 
                type="text" 
                placeholder="e.g. A" 
                className={styles.input} 
                value={section}
                onChange={e => setSection(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label>Classroom</label>
              <select className={styles.input} value={selectedClassroom} onChange={e => setSelectedClassroom(e.target.value)}>
                 <option value="none">No Classroom</option>
                 {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Gender *</label>
              <select className={styles.input} value={gender} onChange={e => setGender(e.target.value)} required>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.createBtn}>{studentToEdit ? 'Save Changes' : 'Register'}</button>
        </div>
      </form>
    </div>
  );
}
