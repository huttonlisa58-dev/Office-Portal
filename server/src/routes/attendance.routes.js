import { Router } from 'express';
import * as c from '../controllers/attendance.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import { ROLES } from '../config/constants.js';

const r = Router();
r.use(protect, resolveTenant, requireTenant);
r.post('/check-in', c.checkIn);
r.post('/check-out', c.checkOut);
r.get('/', c.listAttendance);
r.get('/today', authorize(ROLES.COMPANY_ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.SUPER_ADMIN), c.todaySummary);
export default r;
