import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { createPoll, updatePoll, getClassrooms, getStudents } from '../services/api';
import styles from './CreatePollModal.module.css';

export default function CreatePollModal({ isOpen, onClose, onSuccess, pollToEdit }) {
  const [itemType, setItemType] = useState('poll');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['Done', 'Not Done']);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [students, setStudents] = useState([]);
  const [excludedStudentIds, setExcludedStudentIds] = useState([]);
  const [duration, setDuration] = useState('never');
  const [allowMultiple, setAllowMultiple] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getClassrooms().then(data => {
        setClassrooms(data);
        if (data.length > 0) {
          const defaultClassroom = pollToEdit ? pollToEdit.classroomId : data[0].id;
          setSelectedClassroom(defaultClassroom);
          loadClassroomStudents(defaultClassroom);
        }
      }).catch(console.error);

      if (pollToEdit) {
        setItemType(pollToEdit.itemType || 'poll');
        setQuestion(pollToEdit.question);
        setOptions(pollToEdit.options);
        setExcludedStudentIds(pollToEdit.excludedStudentIds || []);
        setAllowMultiple(!!pollToEdit.allowMultiple);
        if (pollToEdit.expiresAt) {
          const diffMs = new Date(pollToEdit.expiresAt) - new Date(pollToEdit.createdAt || Date.now());
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          setDuration(diffDays > 0 ? diffDays.toString() : '1');
        } else {
          setDuration('never');
        }
      } else {
        setItemType('poll');
        setQuestion('');
        setOptions(['Done', 'Not Done']);
        setExcludedStudentIds([]);
        setDuration('never');
        setAllowMultiple(false);
      }
    }
  }, [isOpen, pollToEdit]);

  const loadClassroomStudents = (classroomId) => {
    if (!classroomId) return;
    getStudents().then(data => {
      const classStudents = data.filter(s => s.classroomId === classroomId);
      setStudents(classStudents);
    }).catch(console.error);
  };

  const handleClassroomChange = (classroomId) => {
    setSelectedClassroom(classroomId);
    loadClassroomStudents(classroomId);
    // Reset exclusions for the new classroom
    setExcludedStudentIds([]);
  };

  if (!isOpen) return null;

  const handleAddOption = () => setOptions([...options, `Option ${options.length + 1}`]);
  
  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };
  
  const handleOptionChange = (val, index) => {
    const newOptions = [...options];
    newOptions[index] = val;
    setOptions(newOptions);
  };

  const toggleStudentExclusion = (studentId) => {
    if (excludedStudentIds.includes(studentId)) {
      setExcludedStudentIds(excludedStudentIds.filter(id => id !== studentId));
    } else {
      setExcludedStudentIds([...excludedStudentIds, studentId]);
    }
  };

  const handleSubmit = async () => {
    if (!question || !selectedClassroom) {
      window.showToast("Please enter a question and select a classroom.", "error");
      return;
    }

    if (itemType === 'poll') {
      const uniqueOptions = new Set(options.map(o => o.trim()));
      if (uniqueOptions.size !== options.length) {
        window.showToast("Poll options must be unique.", "error");
        return;
      }
      if (options.some(o => o.trim() === '')) {
        window.showToast("Options cannot be empty.", "error");
        return;
      }
    }

    try {
      const finalChoices = itemType === 'activity' ? ['Done', 'Not Done'] : options;
      
      let expiresAt = null;
      if (duration !== 'never') {
        const days = parseInt(duration);
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }

      const optionsData = {
        choices: finalChoices,
        allowMultiple: itemType === 'poll' && allowMultiple
      };
      if (expiresAt) {
        optionsData.expiresAt = expiresAt;
      }
      
      if (pollToEdit) {
        await updatePoll(pollToEdit.id, {
          question,
          options: optionsData,
          classroomId: selectedClassroom,
          itemType,
          excludedStudentIds: []
        });
        window.showToast(`${itemType === 'activity' ? 'Activity' : 'Poll'} updated successfully!`, "success");
      } else {
        await createPoll({
          question,
          options: optionsData,
          classroomId: selectedClassroom,
          status: 'live',
          itemType,
          excludedStudentIds: []
        });
        window.showToast(`${itemType === 'activity' ? 'Activity' : 'Poll'} created and published!`, "success");
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      window.showToast(pollToEdit ? "Failed to save poll changes." : "Failed to publish poll.", "error");
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {pollToEdit 
              ? `Edit ${itemType === 'activity' ? 'Activity' : 'Poll'}` 
              : `Create New Item`
            }
          </h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className={styles.body} style={{ maxHeight: '460px', overflowY: 'auto' }}>
          {!pollToEdit && (
            <div className={styles.formGroup} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  checked={itemType === 'poll'} 
                  onChange={() => setItemType('poll')} 
                  style={{ accentColor: '#5c67ff' }}
                />
                Poll
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  checked={itemType === 'activity'} 
                  onChange={() => setItemType('activity')} 
                  style={{ accentColor: '#5c67ff' }}
                />
                Activity (To Do)
              </label>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Select Classroom</label>
            <select 
              className={styles.input} 
              value={selectedClassroom} 
              onChange={e => handleClassroomChange(e.target.value)}
            >
               {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Active Duration (Days)</label>
            <select 
              className={styles.input} 
              value={duration} 
              onChange={e => setDuration(e.target.value)}
            >
              <option value="never">Never Expires</option>
              <option value="1">1 Day</option>
              <option value="2">2 Days</option>
              <option value="3">3 Days</option>
              <option value="7">7 Days</option>
            </select>
          </div>

          {itemType === 'poll' && (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input 
                type="checkbox" 
                id="allowMultipleCheckbox"
                checked={allowMultiple} 
                onChange={e => setAllowMultiple(e.target.checked)} 
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#5c67ff' }}
              />
            <label htmlFor="allowMultipleCheckbox" style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 500, margin: 0 }}>
                Allow Multiple Selections (Checkboxes instead of Radio Buttons)
              </label>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>{itemType === 'activity' ? 'Activity Task / Description' : 'Poll Question'}</label>
            <input 
              type="text" 
              placeholder={itemType === 'activity' ? "e.g. Complete Chapter 4 Reading" : "e.g. Have you completed today's homework?"} 
              className={styles.input} 
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
          </div>
          
          {itemType === 'poll' && (
            <div className={styles.formGroup}>
              <label>Options (Minimum 2)</label>
            {options.map((opt, i) => (
              <div key={i} className={styles.optionInputGroup}>
                <input 
                  type="text" 
                  value={opt} 
                  className={styles.input} 
                  onChange={(e) => handleOptionChange(e.target.value, i)} 
                />
                <button 
                  className={styles.removeBtn} 
                  onClick={() => handleRemoveOption(i)}
                  disabled={options.length <= 2}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button className={styles.addOptionBtn} onClick={handleAddOption}><Plus size={16} /> Add Option</button>
          </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.createBtn} onClick={handleSubmit}>
            {pollToEdit ? "Save Changes" : (itemType === 'activity' ? "Create Activity" : "Create Poll")}
          </button>
        </div>
      </div>
    </div>
  );
}
