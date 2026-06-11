# Deployment Guide

A common, low-cost setup: **MongoDB Atlas** (database) + **Render** (Express API) +
**Vercel** (Next.js frontend). Any equivalent hosts work.

## 1. Database — MongoDB Atlas
1. Create a free cluster at mongodb.com/atlas.
2. Add a database user and allow network access (your host's IPs, or `0.0.0.0/0` for a quick start).
3. Copy the connection string → this becomes `MONGO_URI`.

## 2. Backend — Render (or Railway/Fly/any Node host)
1. New **Web Service** from your repo, root directory `server`.
2. Build command: `npm install` · Start command: `npm start`.
3. Environment variables (from `server/.env.example`):
   - `MONGO_URI`, `JWT_SECRET` (long random string), `CLIENT_URL` (your Vercel URL)
   - `OTP_EXPIRES_MINUTES`, `SEED_ADMIN_*`
   - SMTP: `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` (omit to log emails to console)
   - Cloudinary: `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`
   - Optional: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `ANTHROPIC_API_KEY`
4. After first deploy, seed once: run `npm run seed` via the host's shell/job (or
   temporarily locally pointed at the production `MONGO_URI`).

## 3. Frontend — Vercel
1. Import the repo, set the project root to `client`.
2. Framework preset: **Next.js** (build `next build`, output handled automatically).
3. Environment variable: `NEXT_PUBLIC_API_URL = https://<your-render-app>.onrender.com/api`.
4. Deploy. Update the backend's `CLIENT_URL` to the Vercel domain so CORS allows it.

## 4. Post-deploy checklist
- [ ] `GET /api/health` returns ok on the API host.
- [ ] Frontend loads and login works with a seeded account.
- [ ] CORS: backend `CLIENT_URL` matches the frontend origin exactly.
- [ ] Rotate `JWT_SECRET` and change seeded admin credentials.
- [ ] Configure SMTP + Cloudinary for real email/uploads.
- [ ] (Optional) Set WhatsApp + Anthropic keys to enable those channels.

## Production hardening (recommended)
- Move the JWT to httpOnly cookies via a thin server proxy instead of `localStorage`.
- Add request logging/monitoring and Mongo backups.
- Put the API behind HTTPS and a rate-limited gateway (basic rate limiting is already on).
- Add indexes review and load testing before scale.

## PWA / mobile
The dashboard is responsive. To ship a mobile app quickly, add a web-app manifest +
service worker (PWA), or build a React Native client against the same `/api`.
