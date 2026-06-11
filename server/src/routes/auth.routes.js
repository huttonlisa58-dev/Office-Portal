import { Router } from 'express';
import * as c from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const r = Router();
r.post('/register-company', c.registerCompany);
r.post('/login', c.login);
r.post('/verify-otp', c.verifyOtp);
r.post('/resend-otp', c.resendOtp);
r.post('/forgot-password', c.forgotPassword);
r.post('/reset-password', c.resetPassword);
r.get('/me', protect, c.me);
export default r;
