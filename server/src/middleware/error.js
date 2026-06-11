import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });

export const errorHandler = (err, req, res, next) => { // eslint-disable-line
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';
  let details = err.details || null;

  if (err.name === 'ValidationError') {
    status = 400;
    details = Object.values(err.errors).map((e) => e.message);
    message = 'Validation failed';
  }
  if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for: ${Object.keys(err.keyValue).join(', ')}`;
  }
  if (process.env.NODE_ENV !== 'production' && status === 500) console.error(err);

  res.status(status).json({ success: false, message, details });
};
