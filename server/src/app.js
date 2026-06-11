import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import api from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

// --- Security middleware ---
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Global rate limit; stricter limit on auth routes
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }));

app.use('/api', api);

app.use(notFound);
app.use(errorHandler);

export default app;
