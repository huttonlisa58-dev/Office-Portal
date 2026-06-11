import { Router } from 'express';
import * as c from '../controllers/org.controller.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.js';
import { ROLES } from '../config/constants.js';

const r = Router();
r.use(protect, resolveTenant, requireTenant);
const manage = authorize(ROLES.COMPANY_ADMIN, ROLES.HR, ROLES.SUPER_ADMIN);

r.get('/departments', c.listDepartments);
r.post('/departments', manage, c.createDepartment);
r.patch('/departments/:id', manage, c.updateDepartment);
r.delete('/departments/:id', manage, c.deleteDepartment);

r.get('/designations', c.listDesignations);
r.post('/designations', manage, c.createDesignation);
r.delete('/designations/:id', manage, c.deleteDesignation);
export default r;
