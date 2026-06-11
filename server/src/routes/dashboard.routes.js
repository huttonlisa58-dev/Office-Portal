import { Router } from 'express';
import { dashboard } from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';

const r = Router();
r.get('/', protect, resolveTenant, dashboard);
export default r;
