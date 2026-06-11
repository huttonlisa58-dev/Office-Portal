import PDFDocument from 'pdfkit';

// Returns a Promise<Buffer> containing the rendered payslip PDF.
export function generatePayslipPDF({ company, employee, payroll }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const cur = payroll.currency || 'USD';
    const money = (n) => `${cur} ${Number(n || 0).toFixed(2)}`;
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Header
    doc.fontSize(20).fillColor('#0f172a').text(company.name, { continued: false });
    doc.fontSize(10).fillColor('#64748b').text('Payslip', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#0f172a')
      .text(`Pay period: ${months[payroll.month]} ${payroll.year}`);
    doc.moveDown();

    // Employee block
    doc.fontSize(11).fillColor('#0f172a');
    doc.text(`Employee: ${employee.firstName} ${employee.lastName || ''}`);
    doc.text(`Employee ID: ${employee.employeeId}`);
    if (employee.email) doc.text(`Email: ${employee.email}`);
    doc.moveDown();

    const line = (label, value, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(11);
      const y = doc.y;
      doc.text(label, 50, y);
      doc.text(value, 350, y, { width: 195, align: 'right' });
      doc.moveDown(0.4);
    };

    doc.font('Helvetica-Bold').fontSize(13).text('Earnings');
    doc.moveDown(0.3);
    line('Basic', money(payroll.basic));
    (payroll.allowances || []).forEach((a) => line(a.label, money(a.amount)));
    if (payroll.bonus) line('Bonus', money(payroll.bonus));
    line('Gross', money(payroll.gross), true);
    doc.moveDown(0.6);

    doc.font('Helvetica-Bold').fontSize(13).text('Deductions');
    doc.moveDown(0.3);
    (payroll.deductions || []).forEach((d) => line(d.label, money(d.amount)));
    line('Tax', money(payroll.tax));
    if (payroll.lopDays) line(`Loss of pay (${payroll.lopDays} days)`, '—');
    doc.moveDown(0.6);

    doc.rect(50, doc.y, 495, 28).fill('#0ea5e9');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(13)
      .text(`Net Pay: ${money(payroll.netPay)}`, 60, doc.y - 20);

    doc.moveDown(2).fillColor('#94a3b8').font('Helvetica').fontSize(9)
      .text('This is a system-generated payslip and does not require a signature.', 50, doc.y, { align: 'center' });

    doc.end();
  });
}
