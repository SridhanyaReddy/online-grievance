const ExcelJS = require('exceljs');

/**
 * Generate Excel Report and stream to response
 */
const generateExcelReport = async (reportData, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Grievance Stats');

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Grievance-Report.xlsx');

  // Title Block
  worksheet.mergeCells('A1:E1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Grievance Redressal System - Analytics Report';
  titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E3A8A' } // Sleek deep blue
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 40;

  // Metadata Block
  worksheet.getCell('A3').value = 'Generated Date:';
  worksheet.getCell('B3').value = new Date().toLocaleDateString();
  worksheet.getCell('A4').value = 'Total Complaints:';
  worksheet.getCell('B4').value = reportData.totalComplaints;
  worksheet.getCell('A5').value = 'Resolved Rate:';
  worksheet.getCell('B5').value = `${((reportData.resolvedComplaints / (reportData.totalComplaints || 1)) * 100).toFixed(2)}%`;

  // Apply styling to metadata
  ['A3', 'A4', 'A5'].forEach(cellRef => {
    worksheet.getCell(cellRef).font = { bold: true };
  });

  // Table Headers
  const headerRow = worksheet.getRow(7);
  headerRow.values = ['Department Name', 'Total Complaints', 'Resolved Cases', 'Escalated Cases', 'Resolution Rate'];
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '0F172A' } // Charcoal
    };
    cell.alignment = { horizontal: 'center' };
  });

  // Insert Data
  reportData.departments.forEach((dept, index) => {
    const row = worksheet.addRow([
      dept.name,
      dept.total,
      dept.resolved,
      dept.escalated,
      `${((dept.resolved / (dept.total || 1)) * 100).toFixed(1)}%`
    ]);
    // Zebra striping
    if (index % 2 === 1) {
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8FAFC' }
        };
      });
    }
  });

  // Autofit Column Widths
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      const columnLength = cell.value ? cell.value.toString().length : 0;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.max(maxLength + 4, 12);
  });

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = { generateExcelReport };
