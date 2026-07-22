import { useState, useEffect } from 'react';
import { 
  FileText, Download, Printer, RefreshCw, BarChart2, CheckCircle, 
  AlertTriangle, Users, Award, ShieldAlert, BadgeCheck, FileSpreadsheet, MapPin, Trash2, Save, Clock,
  Smartphone
} from 'lucide-react';
import { 
  getClassrooms, getStaffPolls, getPollResults, getCurrentUser, deletePoll
} from '../services/api';
import { getAppConfig } from '../config/appConfig';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import ConfirmModal from '../components/ConfirmModal';
import styles from './Reports.module.css';
import { generateMobileReport } from '../utils/generateMobileReport.js';

export default function Reports() {
  const currentUser = getCurrentUser();
  const config = getAppConfig();
  const [classrooms, setClassrooms] = useState([]);
  const [polls, setPolls] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('all');
  const [selectedPollId, setSelectedPollId] = useState('');
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load saved reports and auto-delete those older than 15 days
  useEffect(() => {
    const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
    const raw = localStorage.getItem('edupoll_saved_reports');
    if (raw) {
      const all = JSON.parse(raw);
      const filtered = all.filter(r => Date.now() - new Date(r.savedAt).getTime() < FIFTEEN_DAYS);
      setSavedReports(filtered);
      if (filtered.length !== all.length) {
        localStorage.setItem('edupoll_saved_reports', JSON.stringify(filtered));
      }
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [clsData, pollsData] = await Promise.all([
          getClassrooms().catch(() => []),
          getStaffPolls().catch(() => [])
        ]);
        setClassrooms(clsData);
        setPolls(pollsData);
        if (pollsData.length > 0) {
          setSelectedPollId(pollsData[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedPollId) {
      setSelectedPoll(null);
      setResults(null);
      return;
    }
    const poll = polls.find(p => p.id === selectedPollId);
    setSelectedPoll(poll);
    
    setLoading(true);
    getPollResults(selectedPollId)
      .then(res => {
        setResults(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedPollId, polls]);

  const filteredPolls = selectedClassroom === 'all'
    ? polls
    : polls.filter(p => p.classroomId === selectedClassroom);

  const handleExportExcel = () => {
    if (!selectedPoll || !results) return;
    
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Summary Info
    const summaryData = [
      ["EduPoll Participation Summary"],
      ["Report Generated At", new Date().toLocaleString()],
      [""],
      ["Poll Details", ""],
      ["Poll ID", selectedPoll.id],
      ["Question", selectedPoll.question],
      ["Classroom ID", selectedPoll.classroomId],
      ["Status", selectedPoll.status],
      [""],
      ["Statistics", ""],
      ["Total Students", results.totalStudents],
      ["Responded", results.totalResponses],
      ["Pending", results.notAnswered?.length || 0],
      ["Participation Rate", `${results.totalStudents > 0 ? Math.round((results.totalResponses / results.totalStudents) * 100) : 0}%`]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

    // Auto-fit columns helper
    const fitToColumn = (ws) => {
      ws['!cols'] = Object.keys(ws)
        .filter(k => k[0] !== '!')
        .reduce((cols, cellName) => {
          const col = cellName.replace(/[0-9]/g, '');
          const cell = ws[cellName];
          const valStr = cell && cell.v !== undefined ? String(cell.v) : '';
          const colIndex = col.charCodeAt(0) - 65;
          if (colIndex >= 0 && colIndex < 26) {
            const currentWidth = cols[colIndex] ? cols[colIndex].wch : 10;
            cols[colIndex] = { wch: Math.max(currentWidth, valStr.length + 3) };
          }
          return cols;
        }, []);
    };

    fitToColumn(wsSummary);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Sheet 2: Responded Students
    const respondedRows = (results.answered || []).map((s, idx) => ({
      "No.": idx + 1,
      "Student ID": s.id,
      "Student Name": s.name,
      "Answer/Choice": s.choice || "N/A",
      "Submitted At": s.time ? new Date(s.time).toLocaleString() : "N/A",
      "Status": "Responded"
    }));
    const wsResponded = XLSX.utils.json_to_sheet(respondedRows);
    fitToColumn(wsResponded);
    XLSX.utils.book_append_sheet(wb, wsResponded, "Responded");

    // Sheet 3: Pending Students
    const pendingRows = (results.notAnswered || []).map((s, idx) => ({
      "No.": idx + 1,
      "Student ID": s.id,
      "Student Name": s.name,
      "Status": "Pending"
    }));
    const wsPending = XLSX.utils.json_to_sheet(pendingRows);
    fitToColumn(wsPending);
    XLSX.utils.book_append_sheet(wb, wsPending, "Not Responded");

    XLSX.writeFile(wb, `EduPoll_Report_${selectedPoll.id}.xlsx`);
    window.showToast?.("Excel report exported successfully!", "success");
  };

  // ── Desktop PDF (existing – DO NOT MODIFY) ─────────────────────
  // ── Desktop PDF (existing – modified to capture premium layout) ──
  const handleExportPdf = async () => {
    const page1 = document.getElementById('report-page-1');
    if (!page1) return;

    setGenerating(true);
    window.showToast?.("Generating report PDF. Please wait...", "info");

    try {
      const canvas1 = await html2canvas(page1, { scale: 2, useCORS: true, logging: false });
      const imgData1 = canvas1.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate image height based on canvas aspect ratio
      const imgHeight = (canvas1.height * pdfWidth) / canvas1.width;
      
      // Use dynamic page height if content overflows A4 height to prevent clipping
      const finalPdf = imgHeight > pdfHeight 
        ? new jsPDF('p', 'mm', [pdfWidth, imgHeight])
        : pdf;

      finalPdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, imgHeight);
      finalPdf.save(`EduPoll_Report_${selectedPoll.id}.pdf`);
      window.showToast?.("PDF report downloaded!", "success");
    } catch (err) {
      console.error(err);
      window.showToast?.("Failed to generate PDF.", "error");
    } finally {
      setGenerating(false);
    }
  };

  // ── Mobile PDF Generator ──────────────────────────────────────
  const handleDownloadMobilePdf = async () => {
    if (!selectedPoll || !results) return;
    setGenerating(true);
    window.showToast?.("Generating mobile-optimised PDF. Please wait...", "info");
    try {
      await generateMobileReport({
        selectedPoll,
        results,
        classrooms,
        currentUser,
      });
      window.showToast?.("Mobile PDF report downloaded!", "success");
    } catch (err) {
      console.error(err);
      window.showToast?.("Failed to generate mobile PDF.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveReport = () => {
    if (!selectedPoll || !results) return;
    const report = {
      id: `RPT-${Date.now()}`,
      pollId: selectedPoll.id,
      question: selectedPoll.question,
      classroomId: selectedPoll.classroomId,
      responsesCount: results.totalResponses,
      totalStudents: results.totalStudents,
      savedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const updated = [report, ...savedReports].slice(0, 30);
    setSavedReports(updated);
    localStorage.setItem('edupoll_saved_reports', JSON.stringify(updated));
    window.showToast?.('Report saved! It will auto-delete after 15 days.', 'success');
  };

  const handleDeleteSavedReport = (id) => {
    const updated = savedReports.filter(r => r.id !== id);
    setSavedReports(updated);
    localStorage.setItem('edupoll_saved_reports', JSON.stringify(updated));
    window.showToast?.('Saved report deleted.', 'success');
  };

  const handleDeletePoll = () => {
    if (!selectedPollId) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeletePoll = async () => {
    setShowDeleteConfirm(false);
    if (!selectedPollId) return;
    try {
      const res = await deletePoll(selectedPollId);
      if (res.archived) {
        window.showToast?.("Poll moved to Archive successfully!", "success");
      } else {
        window.showToast?.("Poll and response data deleted successfully!", "success");
      }
      // Remove from local state
      const updatedPolls = polls.filter(p => p.id !== selectedPollId);
      setPolls(updatedPolls);
      setSelectedPollId(updatedPolls.length > 0 ? updatedPolls[0].id : '');
    } catch (err) {
      console.error(err);
      window.showToast?.("Failed to delete poll.", "error");
    }
  };

  const participationRate = results?.totalStudents > 0 
    ? Math.round((results.totalResponses / results.totalStudents) * 100)
    : 0;

  const answered = results?.answered || [];
  const notAnswered = results?.notAnswered || [];

  // Group answered students by selected option dynamically
  const groups = {};
  answered.forEach(student => {
    const option = student.choice || 'Other';
    if (!groups[option]) {
      groups[option] = [];
    }
    groups[option].push(student);
  });

  return (
    <div className={styles.container}>
      {/* 1. Header controls */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Reports Module</h2>
          <p className={styles.subtitle}>Generate professional, audit-ready PDF/Excel sheets</p>
        </div>
        
        {selectedPoll && results && (
          <div className={styles.headerActions}>
            <button className={styles.excelBtn} onClick={handleExportExcel} disabled={generating}>
              <FileSpreadsheet size={16} /> Excel Export
            </button>
            <button className={styles.saveReportBtn} onClick={handleSaveReport} title="Save report for 15 days">
              <Save size={16} /> Save Report
            </button>
            {selectedPoll.staffId === currentUser?.id && (
              <button 
                onClick={handleDeletePoll} 
                disabled={generating}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '0.625rem 1.25rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Delete this poll and response data permanently"
              >
                <Trash2 size={16} /> Delete Poll
              </button>
            )}
            <button className={styles.primaryBtn} onClick={handleExportPdf} disabled={generating} title="Download the premium standard desktop PDF report">
              <Printer size={16} /> {generating ? 'Generating...' : 'Download PDF Report'}
            </button>
            <button className={styles.primaryBtn} style={{ background: '#7c3aed' }} onClick={handleDownloadMobilePdf} disabled={generating} title="Download the mobile-optimised portrait PDF report">
              <Smartphone size={16} /> {generating ? 'Generating...' : 'Download Mobile PDF'}
            </button>
          </div>
        )}
      </div>

      {/* 2. Selection bar */}
      <div className={styles.filterBar}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Classroom</label>
            <select 
              className={styles.select} 
              value={selectedClassroom} 
              onChange={e => {
                setSelectedClassroom(e.target.value);
                setSelectedPollId('');
              }}
            >
              <option value="all">All Classrooms</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2, minWidth: '300px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Select Poll/Activity</label>
            <select 
              className={styles.select} 
              value={selectedPollId} 
              onChange={e => setSelectedPollId(e.target.value)}
            >
              <option value="" disabled>-- Choose a Poll --</option>
              {filteredPolls.map(p => <option key={p.id} value={p.id}>{p.question}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className={styles.loader}>Loading poll details and participation database...</div>}

      {!loading && !selectedPoll && (
        <div className={styles.emptyState}>
          <FileText size={48} className={styles.emptyIcon} />
          <h3>No Poll Selected</h3>
          <p>Please select a poll from the dropdown menu to preview and generate reports.</p>
        </div>
      )}

      {/* Saved Reports Section */}
      {savedReports.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Clock size={16} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Saved Reports</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>Auto-deleted after 15 days</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {savedReports.map(r => {
              const daysLeft = Math.ceil((new Date(r.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={r.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px',
                  padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', flex: 1 }}>{r.question}</span>
                    <button
                      onClick={() => handleDeleteSavedReport(r.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem', borderRadius: '6px', flexShrink: 0 }}
                      title="Delete saved report"
                    ><Trash2 size={14} /></button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {r.responsesCount}/{r.totalStudents} responses · Saved {new Date(r.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: daysLeft <= 3 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                    ⏳ Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!loading && selectedPoll && results && (
        <div className={styles.previewContainer}>
          <div className={styles.previewHeader}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Report Template Preview (A4 Page)</span>
          </div>

          <div className={styles.pageScrollArea}>
            {/* ── SINGLE A4 PAGE PREVIEW (matches premium layout exactly) ── */}
            <div id="report-page-1" className={styles.a4Page} style={{ height: 'auto', minHeight: '297mm', padding: '15mm 12mm' }}>
              
              {/* Header section with brand logo & doc title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1e3a8a', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg width="45" height="45" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="46" stroke="#1e3a8a" strokeWidth="8" fill="#ffffff"/>
                    <path d="M25 45 L50 30 L75 45 L50 60 Z" fill="#1e3a8a"/>
                    <path d="M35 51 L35 70 C35 75, 65 75, 65 70 L65 51" stroke="#1e3a8a" strokeWidth="6" strokeLinecap="round" fill="none"/>
                    <path d="M75 45 L75 65" stroke="#1e3a8a" strokeWidth="4" strokeLinecap="round"/>
                    <circle cx="75" cy="65" r="4" fill="#1e3a8a"/>
                  </svg>
                  <div>
                    <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.05em', lineHeight: 1 }}>EDUPOLL</span>
                    <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.02em' }}>Smart Polling. Better Learning.</div>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <div style={{ height: '2px', backgroundColor: '#1e3a8a', width: '20px' }}></div>
                    <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '0.05em' }}>EDUPOLL</span>
                    <div style={{ height: '2px', backgroundColor: '#1e3a8a', width: '20px' }}></div>
                  </div>
                  <h1 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0 0 0', letterSpacing: '0.03em' }}>CLASSROOM POLL REPORT</h1>
                </div>
              </div>

              {/* Bordered Information Card */}
              <div className={styles.infoCard}>
                <div className={styles.infoCardLeft} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '120px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Poll Title</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', flex: 1 }}>{selectedPoll.question}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '120px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Description</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155', flex: 1 }}>{selectedPoll.description || 'No description provided.'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '120px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Created By</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', flex: 1 }}>{selectedPoll.staffName || currentUser?.name || 'Mrs. Devika'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '120px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Classroom</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', flex: 1 }}>{classrooms.find(c => c.id === selectedPoll.classroomId)?.name || selectedPoll.classroomId}</span>
                  </div>
                </div>
                
                <div className={styles.infoCardRight} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', borderLeft: '1px solid #cbd5e1', paddingLeft: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '100px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Poll Type</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Classroom Poll</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '100px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Created On</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      {new Date(selectedPoll.createdAt || selectedPoll.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(selectedPoll.createdAt || selectedPoll.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: '100px', fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>Deadline</span>
                    <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>:</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      {selectedPoll.deadline || selectedPoll.endsAt ? 
                        `${new Date(selectedPoll.deadline || selectedPoll.endsAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(selectedPoll.deadline || selectedPoll.endsAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` 
                        : 'No Deadline'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary stats section */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{
                  backgroundColor: '#1e3a8a',
                  color: '#ffffff',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '0.4rem 0',
                  borderRadius: '4px 4px 0 0',
                  letterSpacing: '0.1em'
                }}>
                  SUMMARY
                </div>
                <div className={styles.summaryStatsGrid} style={{
                  gridTemplateColumns: `repeat(${4 + Object.keys(groups).length}, 1fr)`,
                }}>
                  {/* Total Students Card */}
                  <div style={{ padding: '0.75rem 0.25rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <div style={{ color: '#2563eb' }}>
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20c-2.202 0-4.277-.625-6.043-1.72v-.108a8.884 8.884 0 018.884-8.884h.77a8.974 8.974 0 017.382 3.844M15 17.15v-.003a9.023 9.023 0 00-6-8.312M15 17.15v-.003c.174-.83.272-1.688.272-2.564 0-2.83-1.664-5.267-4.072-6.402M11.601 21.921c.338-.135.66-.307.962-.511m-2.166 2.433a10.963 10.963 0 01-3.235-1.258" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Total Students</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{results.totalStudents}</span>
                  </div>

                  {/* Submitted Card */}
                  <div style={{ padding: '0.75rem 0.25rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <div style={{ color: '#16a34a' }}>
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Submitted</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{results.totalResponses}</span>
                  </div>

                  {/* Not Responded Card */}
                  <div style={{ padding: '0.75rem 0.25rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <div style={{ color: '#ea580c' }}>
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Not Responded</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{notAnswered.length}</span>
                  </div>

                  {/* Option Specific Cards */}
                  {Object.entries(groups).map(([option, students], idx) => {
                    const isPositive = option.toLowerCase() === 'done' || option.toLowerCase() === 'yes';
                    const cardColor = isPositive ? '#16a34a' : '#dc2626';
                    return (
                      <div key={idx} style={{ padding: '0.75rem 0.25rem', textAlign: 'center', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <div style={{ color: cardColor }}>
                          {isPositive ? (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{option}</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{students.length}</span>
                      </div>
                    );
                  })}

                  {/* Response Rate Card */}
                  <div style={{ padding: '0.75rem 0.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <div style={{ color: '#7c3aed' }}>
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Response Rate</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{participationRate}%</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Option-based Tables */}
              {Object.entries(groups).map(([option, students], gIdx) => {
                const isPositive = option.toLowerCase() === 'done' || option.toLowerCase() === 'yes';
                const themeColor = isPositive ? '#16a34a' : '#dc2626';
                const lightBg = isPositive ? '#f0fdf4' : '#fef2f2';
                
                return (
                  <div key={gIdx} style={{ marginTop: '1.25rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.75rem',
                      backgroundColor: lightBg,
                      borderLeft: `4px solid ${themeColor}`,
                      borderRadius: '4px',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: themeColor }}>
                        {gIdx + 1}. STUDENTS WHO SELECTED "{option.toUpperCase()}" ({students.length})
                      </span>
                    </div>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.8rem',
                      border: '1px solid #cbd5e1'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '5%', textAlign: 'center', color: '#475569', fontWeight: 700 }}>No.</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '15%', color: '#475569', fontWeight: 700 }}>SEC ID</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '35%', color: '#475569', fontWeight: 700 }}>Student Name</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '20%', textAlign: 'center', color: '#475569', fontWeight: 700 }}>Selected Option</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '15%', color: '#475569', fontWeight: 700 }}>Submitted Time</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '10%', textAlign: 'center', color: '#475569', fontWeight: 700 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ border: '1px solid #cbd5e1', padding: '0.5rem', textAlign: 'center', color: '#6b7280' }}>No students.</td>
                          </tr>
                        ) : (
                          students.map((s, idx) => (
                            <tr key={s.id} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', textAlign: 'center' }}>{idx + 1}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', fontFamily: 'monospace' }}>{s.id}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', fontWeight: 600 }}>{s.name}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', textAlign: 'center', color: themeColor, fontWeight: 700 }}>{option}</td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem' }}>
                                {s.time ? new Date(s.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                              </td>
                              <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>Submitted</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginTop: '0.25rem' }}>
                      Total Students: {students.length}
                    </div>
                  </div>
                );
              })}

              {/* Not Responded Section */}
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.75rem',
                  backgroundColor: '#eff6ff',
                  borderLeft: '4px solid #2563eb',
                  borderRadius: '4px',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#2563eb' }}>
                    {Object.keys(groups).length + 1}. STUDENTS WHO DID NOT RESPOND ({notAnswered.length})
                  </span>
                </div>
                {notAnswered.length === 0 ? (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    color: '#15803d',
                    fontWeight: 700,
                    textAlign: 'center',
                    fontSize: '0.8rem'
                  }}>
                    🎉 All students have successfully submitted their responses!
                  </div>
                ) : (
                  <>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.8rem',
                      border: '1px solid #cbd5e1'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '10%', textAlign: 'center', color: '#475569', fontWeight: 700 }}>No.</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '30%', color: '#475569', fontWeight: 700 }}>SEC ID</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '40%', color: '#475569', fontWeight: 700 }}>Student Name</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '0.45rem 0.5rem', width: '20%', textAlign: 'center', color: '#475569', fontWeight: 700 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notAnswered.map((s, idx) => (
                          <tr key={s.id} style={{ backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', fontFamily: 'monospace' }}>{s.id}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', fontWeight: 600 }}>{s.name}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '0.4rem 0.5rem', textAlign: 'center', color: '#ea580c', fontWeight: 700 }}>Not Responded</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginTop: '0.25rem' }}>
                      Total Students: {notAnswered.length}
                    </div>
                  </>
                )}
              </div>

              {/* Premium Footer section */}
              <div className={styles.reportFooter}>
                <div className={styles.reportFooterLeft} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div>
                    <div style={{ fontWeight: 800 }}>Generated by EduPoll</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Smart Polling. Better Learning.</div>
                  </div>
                </div>
                
                <div className={styles.reportFooterCenter} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                  </svg>
                  <div>
                    <div style={{ fontWeight: 800 }}>Generated On</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                      {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>
                </div>

                <div className={styles.reportFooterRight} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0a2.25 2.25 0 01-2.24 2.25H8.58a2.25 2.25 0 01-2.24-2.25m11.32 0l-.959-5.176M6.34 18l.959-5.176m10.362 0A42.415 42.415 0 0012 12.75c-2.023 0-4.004.141-5.943.414m11.886 0L18.5 7.5a2.25 2.25 0 00-2.25-2.25h-8.5A2.25 2.25 0 005.5 7.5l-.64 5.25" />
                  </svg>
                  <span style={{ fontWeight: 800 }}>Page 1 of 1</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeletePoll}
        title="Delete Poll & Response Data"
        message="Are you sure you want to permanently delete this poll and all of its student response data? This action cannot be undone."
        confirmText="Delete Poll"
        isDanger={true}
      />
    </div>
  );
}
