// ─────────────────────────────────────────────────────────────────
// generateMobileReport.js
// EduPoll – Premium Mobile-first Portrait PDF Generator
// Uses jsPDF + jspdf-autotable
// DO NOT MODIFY – Desktop report is in Reports.jsx (html2canvas-based)
// ─────────────────────────────────────────────────────────────────

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COLORS, FONTS, PAGE } from './reportStyles.js';
import { drawPageHeader, drawPageFooter, groupByOption } from './reportHelpers.js';

// ── Internal helpers ─────────────────────────────────────────────

function sectionTitle(doc, y, text, iconColor = COLORS.accent) {
  const { margin, width } = PAGE;

  // Blue left-bar accent
  doc.setFillColor(...iconColor);
  doc.roundedRect(margin, y, 3, 6, 1, 1, 'F');

  // Light background pill
  doc.setFillColor(...COLORS.sectionBg);
  doc.roundedRect(margin + 4, y, width - margin * 2 - 4, 6, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.textDark);
  doc.text(text, margin + 8, y + 4.2);

  return y + 10;
}

function infoCard(doc, y, fields, classroomName) {
  const { margin, width, usable } = PAGE;
  const lineH = 6.5;
  const cardH = fields.length * lineH + 8;

  doc.setFillColor(...COLORS.cardBg);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, usable, cardH, 3, 3, 'FD');

  let row = y + 6;
  for (const { label, value } of fields) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(label, margin + 4, row);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textDark);
    const val = String(value || '—');
    const wrapped = doc.splitTextToSize(val, usable - 60);
    doc.text(wrapped, margin + 52, row);

    // Dotted separator
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.1);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin + 4, row + 1.5, margin + usable - 4, row + 1.5);
    doc.setLineDashPattern([], 0);

    row += lineH * (wrapped.length || 1);
  }

  return y + cardH + 6;
}

function summaryCards(doc, y, stats) {
  const { margin, usable } = PAGE;
  const cols = 2;
  const gap = 4;
  const cardW = (usable - gap * (cols - 1)) / cols;
  const cardH = 18;

  // Section title
  doc.setFillColor(...COLORS.headerBg);
  doc.roundedRect(margin, y, usable, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('SUMMARY', PAGE.width / 2, y + 5.5, { align: 'center' });
  y += 12;

  for (let i = 0; i < stats.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * (cardW + gap);
    const cy = y + row * (cardH + gap);

    // Card background
    doc.setFillColor(...COLORS.cardBg);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, cy, cardW, cardH, 3, 3, 'FD');

    // Top colored stripe
    doc.setFillColor(...(stats[i].color || COLORS.accent));
    doc.roundedRect(x, cy, cardW, 3, 2, 2, 'F');
    // cover bottom corners of stripe
    doc.rect(x, cy + 1, cardW, 2, 'F');

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...(stats[i].color || COLORS.textDark));
    doc.text(String(stats[i].value), x + cardW / 2, cy + 11, { align: 'center' });

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(stats[i].label, x + cardW / 2, cy + 15.5, { align: 'center' });
  }

  const rows = Math.ceil(stats.length / cols);
  return y + rows * (cardH + gap) + 4;
}

function optionTable(doc, y, optionLabel, students, optionIndex, generatedAt, currentPageRef) {
  const { margin, width, usable, height } = PAGE;

  // If too close to footer, add new page
  if (y > height - 60) {
    doc.addPage();
    currentPageRef.count++;
    y = drawPageHeader(doc, currentPageRef.count, 0, generatedAt);
  }

  // Section heading
  const headColor = optionIndex % 2 === 0 ? COLORS.accent : COLORS.success;
  y = sectionTitle(
    doc, y,
    `${optionIndex + 1}. STUDENTS WHO SELECTED "${optionLabel.toUpperCase()}" (${students.length})`,
    headColor
  );

  const rows = students.map((s, i) => [
    i + 1,
    s.id || '—',
    s.name || '—',
    optionLabel,
    s.submitted_at
      ? new Date(s.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '—',
    'Submitted',
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['No.', 'SEC ID', 'Student Name', 'Selected Option', 'Time', 'Status']],
    body: rows,
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: COLORS.border,
      lineWidth: 0.3,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: COLORS.tableHead,
      textColor: COLORS.tableHeadTxt,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: COLORS.rowAlt,
    },
    bodyStyles: {
      fillColor: COLORS.rowNormal,
      textColor: COLORS.textDark,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 24 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 30 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22, textColor: COLORS.success, fontStyle: 'bold' },
    },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    didDrawPage: (data) => {
      // Each newly drawn page gets header/footer via the afterPage hook below
      currentPageRef.lastTableY = data.cursor.y;
    },
  });

  let afterY = doc.lastAutoTable.finalY + 4;

  // "Total" row below table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textDark);
  doc.text(`Total Students: ${students.length}`, width - margin - 2, afterY, { align: 'right' });

  return afterY + 8;
}

function notRespondedTable(doc, y, students, generatedAt, currentPageRef) {
  const { margin, width, height } = PAGE;

  if (y > height - 60) {
    doc.addPage();
    currentPageRef.count++;
    y = drawPageHeader(doc, currentPageRef.count, 0, generatedAt);
  }

  y = sectionTitle(doc, y, `STUDENTS WHO DID NOT RESPOND (${students.length})`, COLORS.danger);

  if (students.length === 0) {
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(margin, y, PAGE.usable, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 163, 74);
    doc.text('🎉  All students responded successfully!', PAGE.width / 2, y + 6.5, { align: 'center' });
    return y + 16;
  }

  const rows = students.map((s, i) => [i + 1, s.id || '—', s.name || '—', 'Not Responded']);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['No.', 'SEC ID', 'Student Name', 'Status']],
    body: rows,
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: COLORS.border,
      lineWidth: 0.3,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: COLORS.danger,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [255, 245, 245] },
    bodyStyles: { textColor: COLORS.textDark },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 30 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 30, textColor: COLORS.danger, fontStyle: 'bold' },
    },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    didDrawPage: () => { currentPageRef.lastTableY = doc.lastAutoTable?.finalY; },
  });

  let afterY = doc.lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textDark);
  doc.text(`Total Not Responded: ${students.length}`, width - margin - 2, afterY, { align: 'right' });
  return afterY + 8;
}

// ── Main export ──────────────────────────────────────────────────

/**
 * Generate a premium mobile-first portrait PDF report.
 *
 * @param {object} params
 * @param {object} params.selectedPoll   Poll object from API
 * @param {object} params.results        Results object from getPollResults()
 * @param {object[]} params.classrooms   Classroom list for name lookup
 * @param {object} params.currentUser    Logged-in staff user
 */
export async function generateMobileReport({ selectedPoll, results, classrooms, currentUser }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generatedAt = new Date();
  const { margin, width, height, usable } = PAGE;

  // Page-count reference (patched after all pages rendered)
  const pageRef = { count: 1, lastTableY: 0 };

  // ── PAGE 1 ─────────────────────────────────────────────────────
  let y = drawPageHeader(doc, 1, 0, generatedAt);

  // Poll info card
  const classroom = classrooms.find((c) => c.id === selectedPoll.classroomId);
  const createdDate = new Date(selectedPoll.createdAt || selectedPoll.created_at);
  const deadlineDate = selectedPoll.deadline || selectedPoll.endsAt ? new Date(selectedPoll.deadline || selectedPoll.endsAt) : null;

  const infoFields = [
    { label: 'Poll Title',    value: selectedPoll.question },
    { label: 'Description',   value: selectedPoll.description || 'Classroom Poll' },
    { label: 'Created By',    value: selectedPoll.staffName || currentUser?.name || 'Staff Member' },
    { label: 'Classroom',     value: classroom?.name || selectedPoll.classroomId },
    { label: 'Created Date',  value: createdDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { label: 'Deadline',      value: deadlineDate ? deadlineDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No Deadline' },
    { label: 'Poll Status',   value: (selectedPoll.status || 'unknown').toUpperCase() },
    { label: 'Poll Type',     value: selectedPoll.type || 'Classroom Poll' },
  ];

  y = infoCard(doc, y, infoFields);

  // ── Summary Cards ──────────────────────────────────────────────
  const totalStudents  = results.totalStudents || 0;
  const submitted      = results.totalResponses || 0;
  const notSubmitted   = results.notAnswered?.length || 0;
  const responseRate   = totalStudents > 0 ? ((submitted / totalStudents) * 100).toFixed(1) : '0.0';

  // Build per-option counts for summary cards
  const { optionGroups, notResponded } = groupByOption(results);

  const summaryStats = [
    { label: 'Total Students', value: totalStudents,  color: COLORS.primary },
    { label: 'Submitted',      value: submitted,       color: COLORS.success },
    { label: 'Not Submitted',  value: notSubmitted,    color: COLORS.danger  },
    ...optionGroups.map((g) => ({ label: g.label, value: g.students.length, color: COLORS.accent })),
    { label: 'Response Rate',  value: `${responseRate}%`, color: COLORS.warning },
  ];

  y = summaryCards(doc, y, summaryStats);

  // ── Option tables ──────────────────────────────────────────────
  for (let i = 0; i < optionGroups.length; i++) {
    const { label, students } = optionGroups[i];
    y = optionTable(doc, y, label, students, i, generatedAt, pageRef);
    // Update page count after auto-table may have added pages
    pageRef.count = doc.internal.getNumberOfPages();
  }

  // ── Not-responded table ────────────────────────────────────────
  y = notRespondedTable(doc, y, notResponded, generatedAt, pageRef);
  pageRef.count = doc.internal.getNumberOfPages();

  // ── Draw headers & footers on ALL pages ───────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Header already drawn on page 1; re-draw on pages added by autoTable
    if (p > 1) drawPageHeader(doc, p, totalPages, generatedAt);
    drawPageFooter(doc, p, totalPages);
  }

  // ── Save ──────────────────────────────────────────────────────
  const safeName = (selectedPoll.question || 'poll')
    .replace(/[^a-z0-9]/gi, '_')
    .slice(0, 30);
  doc.save(`EduPoll_Mobile_Report_${safeName}_${generatedAt.toISOString().slice(0, 10)}.pdf`);
}
