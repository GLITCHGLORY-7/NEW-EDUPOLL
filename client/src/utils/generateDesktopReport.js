// ─────────────────────────────────────────────────────────────────
// generateDesktopReport.js
// EduPoll – Desktop PDF wrapper (preserves original html2canvas logic)
// ─────────────────────────────────────────────────────────────────

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate the existing landscape/portrait desktop PDF using html2canvas.
 * Mirrors the original handleExportPdf() in Reports.jsx exactly.
 *
 * @param {string}   pollId      Poll ID for the filename
 * @param {Function} onStart     Called when generation begins
 * @param {Function} onEnd       Called when generation finishes (success or error)
 * @param {Function} showToast   Toast notification fn
 */
export async function generateDesktopReport(pollId, onStart, onEnd, showToast) {
  const page1 = document.getElementById('report-page-1');
  if (!page1) {
    showToast?.('Report preview not found.', 'error');
    return;
  }

  onStart?.();
  showToast?.('Generating desktop report PDF. Please wait...', 'info');

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
    finalPdf.save(`EduPoll_Report_${pollId}.pdf`);
    showToast?.('PDF report downloaded!', 'success');
  } catch (err) {
    console.error(err);
    showToast?.('Failed to generate PDF.', 'error');
  } finally {
    onEnd?.();
  }
}
