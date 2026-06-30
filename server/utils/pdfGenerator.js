const PDFDocument = require('pdfkit');

/**
 * Generate PDF Complaint Receipt and stream to response
 */
const generateComplaintReceipt = (complaint, res) => {
  const doc = new PDFDocument({ margin: 50 });

  // Set headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Receipt-${complaint.complaintNumber}.pdf`);

  doc.pipe(res);

  // Logo / Title
  doc.fontSize(20).text('NATIONAL GRIEVANCE REDRESSAL PORTAL', { align: 'center' });
  doc.fontSize(10).text('Government Welfare & Citizen Security Service', { align: 'center', color: '#64748b' });
  doc.moveDown(1.5);

  // Horizontal line
  doc.moveTo(50, 110).lineTo(550, 110).stroke('#cbd5e1');
  doc.moveDown(2);

  // Complaint Details Card
  doc.fontSize(14).fillColor('#1e293b').text(`Complaint Tracking Receipt: ${complaint.complaintNumber}`, { underline: true });
  doc.moveDown(1);

  doc.fontSize(11).fillColor('#334155');
  doc.text(`Filed By: ${complaint.citizen?.name || 'Citizen'} (${complaint.citizen?.email || 'N/A'})`);
  doc.text(`Department: ${complaint.department?.name || 'N/A'}`);
  doc.text(`Category: ${complaint.category || 'N/A'}`);
  doc.text(`Priority: ${complaint.priority.toUpperCase()}`);
  doc.text(`Status: ${complaint.status.toUpperCase()}`);
  doc.text(`Submission Date: ${new Date(complaint.createdAt).toLocaleDateString()}`);
  doc.text(`Location: ${complaint.location}`);
  doc.moveDown(1);

  doc.text('Description:', { bold: true });
  doc.fillColor('#475569').text(complaint.description, { width: 500, align: 'justify' });
  doc.moveDown(1.5);

  // Draw QR code if exists
  if (complaint.qrCode) {
    try {
      const base64Data = complaint.qrCode.replace(/^data:image\/png;base64,/, "");
      const imgBuffer = Buffer.from(base64Data, 'base64');
      doc.image(imgBuffer, 400, 130, { width: 120 });
      doc.text('Scan to track progress', 400, 255, { width: 120, align: 'center', size: 9 });
    } catch (e) {
      console.error('Failed to embed QR code in PDF:', e);
    }
  }

  // Timeline
  doc.moveDown(1);
  doc.fontSize(12).fillColor('#1e293b').text('Grievance Resolution Timeline', { underline: true });
  doc.moveDown(0.5);

  complaint.timeline.forEach((step, idx) => {
    doc.fontSize(10).fillColor('#334155').text(
      `${idx + 1}. [${new Date(step.timestamp).toLocaleDateString()}] Status: ${step.status} - Remarks: ${step.remarks || 'No remarks.'}`
    );
  });

  // Footer
  doc.moveDown(3);
  doc.fontSize(9).fillColor('#94a3b8').text('This is a computer generated document. No physical signature is required.', { align: 'center' });
  doc.text(`Document Reference: ${complaint._id}`, { align: 'center' });

  doc.end();
};

/**
 * Generate Department Performance Report
 */
const generateDepartmentReport = (reportData, res) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=Department-Report.pdf');

  doc.pipe(res);

  doc.fontSize(20).text('DEPARTMENT GRIEVANCE REPORT', { align: 'center' });
  doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center', color: '#64748b' });
  doc.moveDown(2);

  doc.fontSize(14).text('Executive Summary', { underline: true });
  doc.moveDown(0.5);
  
  doc.fontSize(11);
  doc.text(`Total Complaints Registered: ${reportData.totalComplaints}`);
  doc.text(`Pending Actions: ${reportData.pendingComplaints}`);
  doc.text(`Resolved Grievances: ${reportData.resolvedComplaints}`);
  doc.text(`Escalated Cases: ${reportData.escalatedComplaints}`);
  doc.text(`Citizen Satisfaction Rating: ${reportData.satisfactionScore || 'N/A'} / 5.0`);
  doc.moveDown(2);

  doc.fontSize(14).text('Performance by Department', { underline: true });
  doc.moveDown(1);

  reportData.departments.forEach((dept) => {
    doc.fontSize(11).text(`${dept.name}:`);
    doc.text(`  - Total complaints: ${dept.total}`);
    doc.text(`  - Resolved: ${dept.resolved} (${((dept.resolved / (dept.total || 1)) * 100).toFixed(1)}%)`);
    doc.text(`  - Escalated: ${dept.escalated}`);
    doc.moveDown(0.5);
  });

  doc.end();
};

module.exports = { generateComplaintReceipt, generateDepartmentReport };
