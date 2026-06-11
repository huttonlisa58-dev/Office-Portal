> **Live backend: Supabase + Twilio.** This project now runs on Supabase (Postgres + Auth + Edge Functions) with Twilio for SMS. See **docs/SUPABASE.md** for the live project, credentials, env vars and deploy steps. The `server/` folder is the original Express/MongoDB implementation, kept for reference.

# HRMS — Multi-Tenant HR SaaS Platform

A production-grade, multi-tenant Human Resource Management System. One backend serves
many companies; each company's data is isolated by a tenant reference enforced in
middleware. Built with **Node.js + Express + MongoDB** on the server and
**Next.js 14 (App Router) + Tailwind CSS** on the client.

> **Scope note (please read).** A full enterprise HRMS is a multi-month effort for a
> team. This repository is a genuinely runnable, well-architected **foundation**: the
> core HR modules work end-to-end, and the more advanced items (face recognition,
> WhatsApp sending, LLM assistant, native mobile app) are wired in with clean,
> clearly-marked integration points rather than fake stubs. See
> [What's complete vs. wired-for-extension](#whats-complete-vs-wired-for-extension).

---

## Highlights

- **Multi-tenant SaaS** — shared database, per-document `company` scoping, subscription plans with seat limits, and a SUPER_ADMIN who can view any tenant.
- **Auth & RBAC** — JWT auth, bcrypt password hashing, email OTP verification, forgot/reset password, and five roles (SUPER_ADMIN, COMPANY_ADMIN, HR, MANAGER, EMPLOYEE).
- **Employees** — CRUD, auto-generated employee IDs (e.g. `ACME-0007`), departments/designations, optional self-service login accounts, Cloudinary document uploads.
- **Attendance** — check-in/out, GPS capture, late detection from company work settings, worked-minutes & overtime, plus QR and **face-recognition** verification paths.
- **Leave** — apply, balance tracking, approval workflow with automatic balance deduction and notifications.
- **Payroll** — salary structures, progressive tax slabs, loss-of-pay proration, bonus/deductions, **PDF payslips**, and mark-as-paid with notifications.
- **Tasks & projects** — assignable tasks, status kanban, progress, comments.
- **Dashboards & reports** — role-adaptive dashboard (platform vs. company), charts, and CSV exports.
- **Notifications** — in-app + email, with a WhatsApp channel ready to enable.
- **AI** — offline statistical attendance-anomaly detection, plus an HR assistant chatbot (LLM-backed when an API key is set).
- **Modern UI** — sidebar navigation, light/dark mode, responsive layout, Recharts analytics.

---

## Tech stack

| Layer    | Choice |
|----------|--------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, Recharts, lucide-react, axios |
| Backend  | Node.js, Express, Mongoose (MongoDB) |
| Auth     | JWT, bcryptjs, email OTP (nodemailer) |
| Files    | Cloudinary (multer memory storage) |
| PDF      | pdfkit (payslips) |
| Security | helmet, cors, express-rate-limit, express-mongo-sanitize |

---

## Repository structure

```
hrms/
├── server/                 # Express + MongoDB API
│   ├── src/
│   │   ├── config/         # db connection, constants (roles, plans, enums)
│   │   ├── models/         # Mongoose schemas (Company, User, Employee, …)
│   │   ├── controllers/    # request handlers per domain
│   │   ├── routes/         # Express routers, mounted under /api
│   │   ├── middleware/     # auth, rbac, tenant, error, upload
│   │   ├── services/       # notifications, whatsapp, face, ai
│   │   ├── utils/          # tokens, email, cloudinary, payslip, seed
│   │   ├── app.js          # express app (security, routes, errors)
│   │   └── server.js       # bootstrap (connect db, listen)
│   └── package.json
├── client/                 # Next.js dashboard + portal
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/       # authenticated shell + module pages
│   │   │   ├── login/       # auth screens (login, OTP, reset)
│   │   │   └── layout.js
│   │   ├── components/      # Sidebar, Topbar, StatCard, Modal, …
│   │   ├── context/         # Auth + Theme providers
│   │   └── lib/             # axios client, formatters
│   └── package.json
└── docs/                   # API reference, schema, deployment guide
```

---

## Quick start (local)

### Prerequisites
- Node.js 18+ (tested on Node 22)
- A MongoDB connection string (local `mongod` or MongoDB Atlas)

### 1. Backend
```bash
cd server
cp .env.example .env          # then edit values (at minimum MONGO_URI, JWT_SECRET)
npm install
npm run seed                  # creates the super admin + a demo company
npm run dev                   # starts on http://localhost:5000
```

### 2. Frontend
```bash
cd client
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm install
npm run dev                        # starts on http://localhost:3000
```

Open <http://localhost:3000>, and sign in with a seeded account below.

---

## Default credentials (created by `npm run seed`)

| Role          | Email           | Password      | Notes |
|---------------|-----------------|---------------|-------|
| Super Admin   | `admin@hrms.io` | `Admin@12345` | Platform-wide; can view any tenant |
| Company Admin | `admin@acme.io` | `Acme@12345`  | Demo company "Acme Inc" |
| HR            | `hr@acme.io`    | `Acme@12345`  | Demo company |
| Employee      | `jane@acme.io`  | `Acme@12345`  | Self-service portal |

> Change `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` before seeding in any
> shared environment. Seeded accounts are pre-verified so you can log in immediately.

The login screen also has one-tap buttons to fill these demo accounts.

---

## What's complete vs. wired-for-extension

**Complete and working end-to-end**
- Multi-tenant auth (JWT + RBAC + OTP + forgot/reset), tenant isolation middleware
- Company/subscription management, seat-limit enforcement
- Employee CRUD + auto IDs + departments/designations
- Attendance check-in/out, late/overtime, GPS capture, today's roster
- Leave apply/approve/balance workflow
- Payroll generation, progressive tax, PDF payslips, mark-paid
- Tasks/projects kanban + comments
- Role-adaptive dashboard, reports + CSV export
- In-app + email notifications (email logs to console in dev when SMTP is unset)
- Statistical attendance-anomaly detection (z-score, fully offline)

**Wired in — needs a credential or extra client work to go live**
- **Face recognition** — server compares embeddings (threshold-based) and the
  `faceEmbedding` field exists; the browser must compute a descriptor (e.g.
  face-api.js) and send it. Enrollment UI is the remaining piece.
- **WhatsApp** — Meta Cloud API integration is in `services/whatsapp.service.js`;
  set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` to send (logs in dev otherwise).
- **AI HR assistant** — set `ANTHROPIC_API_KEY` for real LLM answers; ships a canned
  offline reply so the chat UI works without a key.
- **QR attendance** — the `QR` method is accepted by the API; the scan/generate UI
  is not built.

**Not included (recommended next steps)**
- Native mobile app. The frontend is responsive and can be turned into a PWA; a
  React Native client would consume the same `/api`.

See `docs/` for the full API reference, data schema, and deployment guide.

---

## Security notes
- Passwords hashed with bcrypt; never returned by the API (`select: false`).
- JWT verified on every protected route; tenant scope enforced server-side.
- helmet, CORS, rate limiting, and Mongo-injection sanitization are enabled.
- For production, move the JWT from `localStorage` to httpOnly cookies behind a
  server proxy, and put the API behind HTTPS.

## License
Provided as a starting point for your own product. Review and harden before
production use.
