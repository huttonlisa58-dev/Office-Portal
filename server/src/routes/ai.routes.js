import { Router } from 'express';
import * as c from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import { ROLES } from '../config/constants.js';

const r = Router();
r.use(protect, resolveTenant, requireTenant);
r.get('/attendance-anomalies', authorize(ROLES.COMPANY_ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.SUPER_ADMIN), c.attendanceAnomalies);
r.post('/assistant', c.assistant);
export default r;
