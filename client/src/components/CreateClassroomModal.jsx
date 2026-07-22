import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createClassroom, updateClassroom } from '../services/api';
import styles from './CreatePollModal.module.css';

export default function CreateClassroomModal({ isOpen, onClose, onSuccess, classroomToEdit }) {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [section, setSection] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [staffName, setStaffName] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (classroomToEdit) {
        setName(classroomToEdit.name);
        setYear(classroomToEdit.year || '');
        setSection(classroomToEdit.section || '');
        setDepartment(classroomToEdit.department || '');
        setDescription(classroomToEdit.description || '');
        setStaffName(classroomToEdit.staffName || '');
      } else {
        setName('');
        setYear('');
        setSection('');
        setDepartment('');
        setDescription('');
        setStaffName('');
      }
    }
  }, [isOpen, classroomToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !year || !section || !department) {
      window.showToast("Please fill out all required fields.", "error");
      return;
    }
    try {
      if (classroomToEdit) {
        await updateClassroom(classroomToEdit.id, {
          name,
          year,
          section,
          department,
          description,
          staffName
        });
        window.showToast("Classroom updated successfully!", "success");
      } else {
        await createClassroom({
          name,
          year,
          section,
          department,
          description,
          staffName
        });
        window.showToast("Classroom created successfully!", "success");
      }
      setName('');
      setYear('');
      setSection('');
      setDepartment('');
      setDescription('');
      setStaffName('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      window.showToast(classroomToEdit ? "Failed to save classroom changes." : "Failed to create classroom.", "error");
    }
  };

  return (
    <div className={styles.overlay}>
      <form className={styles.modal} onSubmit={handleSubmit}>
        <div className={styles.header}>
          <h2 className={styles.title}>{classroomToEdit ? "Edit Classroom" : "Create New Classroom"}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className={styles.body}>
          <div className={styles.formGroup}>
            <label>Classroom Name *</label>
            <input 
              type="text" 
              placeholder="e.g. CS-2024-A" 
              className={styles.input} 
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label>Year *</label>
              <select 
                className={styles.input} 
                value={year} 
                onChange={e => setYear(e.target.value)}
                required
              >
                <option value="">Select Year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Section *</label>
              <input 
                type="text" 
                placeholder="e.g. A" 
                className={styles.input} 
                value={section} 
                onChange={e => setSection(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Department *</label>
            <input 
              type="text" 
              placeholder="e.g. Computer Science" 
              className={styles.input} 
              value={department}
              onChange={e => setDepartment(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Staff Name (In charge) *</label>
            <input 
              type="text" 
            placeholder="Staff name responsible for this class"
              className={styles.input} 
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea 
              placeholder="Optional description..." 
              className={styles.input} 
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>
        
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.createBtn}>
            {classroomToEdit ? "Save Changes" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
