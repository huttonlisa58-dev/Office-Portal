import { Router } from 'express';
import * as c from '../controllers/leave.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import { ROLES } from '../config/constants.js';

const r = Router();
r.use(protect, resolveTenant, requireTenant);
r.get('/', c.listLeaves);
r.post('/', c.applyLeave);
r.get('/balance', c.getBalance);
r.patch('/:id/decision', authorize(ROLES.COMPANY_ADMIN, ROLES.HR, ROLES.MANAGER, ROLES.SUPER_ADMIN), c.decideLeave);
r.delete('/:id', c.cancelLeave);
export default r;
