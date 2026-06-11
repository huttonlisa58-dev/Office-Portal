import { Router } from 'express';
import * as c from '../controllers/payroll.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import { ROLES } from '../config/constants.js';

const r = Router();
r.use(protect, resolveTenant, requireTenant);
const manage = authorize(ROLES.COMPANY_ADMIN, ROLES.HR, ROLES.SUPER_ADMIN);

r.put('/structure/:employeeId', manage, c.upsertSalaryStructure);
r.get('/structure/:employeeId', manage, c.getSalaryStructure);
r.post('/generate', manage, c.generatePayroll);
r.get('/', c.listPayroll);
r.get('/:id/payslip', c.downloadPayslip);
r.post('/:id/mark-paid', manage, c.markPaid);
export default r;
