import SalaryStructure from '../models/SalaryStructure.js';
import Payroll from '../models/Payroll.js';
import Employee from '../models/Employee.js';
import Company from '../models/Company.js';
import { PAYROLL_STATUS } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import { generatePayslipPDF } from '../utils/payslip.js';
import { uploadBuffer } from '../utils/cloudinary.js';
import { notify } from '../services/notification.service.js';
import { sendWhatsApp } from '../services/whatsapp.service.js';

const sum = (arr = []) => arr.reduce((a, b) => a + Number(b.amount || 0), 0);

// Progressive tax over slabs [{upTo, rate}]. Slabs sorted ascending.
function computeTax(taxable, slabs = []) {
  if (!slabs.length) return 0;
  const sorted = [...slabs].sort((a, b) => a.upTo - b.upTo);
  let tax = 0, lower = 0;
  for (const slab of sorted) {
    if (taxable > lower) {
      const band = Math.min(taxable, slab.upTo) - lower;
      tax += band * slab.rate;
      lower = slab.upTo;
    }
  }
  if (taxable > lower) tax += (taxable - lower) * sorted[sorted.length - 1].rate;
  return Number(tax.toFixed(2));
}

// PUT /payroll/structure/:employeeId  — create/update salary structure
export const upsertSalaryStructure = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.employeeId, company: req.companyId });
  if (!employee) throw new ApiError(404, 'Employee not found');
  const { basic, allowances, deductions, taxSlabs, currency } = req.body;
  const structure = await SalaryStructure.findOneAndUpdate(
    { company: req.companyId, employee: employee._id },
    { company: req.companyId, employee: employee._id, basic, allowances, deductions, taxSlabs, currency },
    { new: true, upsert: true, runValidators: true }
  );
  return ok(res, { structure }, 'Salary structure saved');
});

export const getSalaryStructure = asyncHandler(async (req, res) => {
  const structure = await SalaryStructure.findOne({ company: req.companyId, employee: req.params.employeeId });
  if (!structure) throw new ApiError(404, 'No salary structure set');
  return ok(res, { structure });
});

// POST /payroll/generate  { employeeId, month, year, bonus, extraDeductions, lopDays }
export const generatePayroll = asyncHandler(async (req, res) => {
  const { employeeId, month, year, bonus = 0, extraDeductions = [], lopDays = 0 } = req.body;
  if (!employeeId || !month || !year) throw new ApiError(400, 'employeeId, month, year required');

  const [employee, structure] = await Promise.all([
    Employee.findOne({ _id: employeeId, company: req.companyId }),
    SalaryStructure.findOne({ company: req.companyId, employee: employeeId }),
  ]);
  if (!employee) throw new ApiError(404, 'Employee not found');
  if (!structure) throw new ApiError(400, 'Set a salary structure first');

  const allowances = structure.allowances || [];
  const baseDeductions = structure.deductions || [];
  const allDeductions = [...baseDeductions, ...extraDeductions];

  // loss-of-pay proration on basic (assume 30-day month)
  const perDay = structure.basic / 30;
  const lopAmount = Number((perDay * Number(lopDays || 0)).toFixed(2));
  if (lopAmount > 0) allDeductions.push({ label: `Loss of pay (${lopDays}d)`, amount: lopAmount });

  const gross = structure.basic + sum(allowances) + Number(bonus);
  const taxable = structure.basic + sum(allowances);
  const tax = computeTax(taxable, structure.taxSlabs);
  const netPay = Number((gross - sum(allDeductions) - tax).toFixed(2));

  const payroll = await Payroll.findOneAndUpdate(
    { company: req.companyId, employee: employeeId, month, year },
    {
      company: req.companyId, employee: employeeId, month, year,
      currency: structure.currency, basic: structure.basic, allowances,
      deductions: allDeductions, bonus, tax, gross, netPay, lopDays,
      status: PAYROLL_STATUS.GENERATED, generatedAt: new Date(),
    },
    { new: true, upsert: true }
  );
  return created(res, { payroll }, 'Payroll generated');
});

// GET /payroll  — list (HR all, employee own)
export const listPayroll = asyncHandler(async (req, res) => {
  const { month, year, employeeId } = req.query;
  const filter = { company: req.companyId };
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);
  if (employeeId) filter.employee = employeeId;
  else if (req.user.employee && !['HR', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role))
    filter.employee = req.user.employee;
  const items = await Payroll.find(filter).populate('employee', 'firstName lastName employeeId').sort({ year: -1, month: -1 });
  return ok(res, { items });
});

// GET /payroll/:id/payslip  — generate + stream the PDF (and cache to Cloudinary)
export const downloadPayslip = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findOne({ _id: req.params.id, company: req.companyId }).lean();
  if (!payroll) throw new ApiError(404, 'Payroll not found');
  // employees may only fetch their own
  if (req.user.employee && String(req.user.employee) !== String(payroll.employee) &&
      !['HR', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(req.user.role))
    throw new ApiError(403, 'Forbidden');

  const [company, employee] = await Promise.all([
    Company.findById(req.companyId).lean(),
    Employee.findById(payroll.employee).lean(),
  ]);
  const pdf = await generatePayslipPDF({ company, employee, payroll });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${employee.employeeId}-${payroll.month}-${payroll.year}.pdf"`);
  return res.send(pdf);
});

// POST /payroll/:id/mark-paid
export const markPaid = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findOne({ _id: req.params.id, company: req.companyId }).populate('employee');
  if (!payroll) throw new ApiError(404, 'Payroll not found');
  payroll.status = PAYROLL_STATUS.PAID;
  payroll.paidAt = new Date();
  await payroll.save();

  if (payroll.employee.user) {
    await notify({
      company: req.companyId, user: payroll.employee.user, type: 'PAYROLL',
      title: 'Salary credited',
      body: `Your salary for ${payroll.month}/${payroll.year} (${payroll.currency} ${payroll.netPay}) has been credited.`,
      email: payroll.employee.email,
    });
  }
  if (payroll.employee.phone) {
    sendWhatsApp({ to: payroll.employee.phone, body: `Salary credited: ${payroll.currency} ${payroll.netPay}` }).catch(() => {});
  }
  return ok(res, { payroll }, 'Marked as paid');
});
