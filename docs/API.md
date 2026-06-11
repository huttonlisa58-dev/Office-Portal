# API Reference

Base URL: `http://localhost:5000/api`

All responses share the envelope:
```json
{ "success": true, "message": "…", "data": { } }
```

## Auth & headers
- Send `Authorization: Bearer <jwt>` on protected routes.
- A SUPER_ADMIN may target a specific tenant by adding `x-company-id: <companyId>`
  (or `?companyId=`). Company-scoped users are bound to their own tenant automatically.

---

## Authentication

| Method | Path | Auth | Body / notes |
|--------|------|------|--------------|
| POST | `/auth/register-company` | public | `{ companyName, slug, name, email, password }` → creates company + COMPANY_ADMIN, sends OTP |
| POST | `/auth/login` | public | `{ email, password }` → `{ token, user }`; 403 if email unverified (re-sends OTP) |
| POST | `/auth/verify-otp` | public | `{ email, code }` → `{ token, user }` |
| POST | `/auth/resend-otp` | public | `{ email }` |
| POST | `/auth/forgot-password` | public | `{ email }` (no account enumeration) |
| POST | `/auth/reset-password` | public | `{ email, code, newPassword }` |
| GET  | `/auth/me` | any | current `{ user, company }` |

## Companies (SUPER_ADMIN unless noted)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/companies` | list with employee counts |
| GET | `/companies/:id` | super admin or that company's admin |
| PATCH | `/companies/:id` | update `name, industry, size, timezone, address, workSettings, logo` |
| PATCH | `/companies/:id/subscription` | `{ plan }` — FREE / STARTER / GROWTH / ENTERPRISE |
| POST | `/companies/:id/hr` | `{ name, email, password }` creates an HR user |
| DELETE | `/companies/:id` | deactivate |

## Employees (admin / HR / manager; employee reads self)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/employees` | `?q=&department=&status=&page=&limit=` paginated |
| POST | `/employees` | create (+ optional `createLogin`, `password`); enforces seat limit |
| GET | `/employees/:id` | one |
| PATCH | `/employees/:id` | update |
| DELETE | `/employees/:id` | remove |
| POST | `/employees/:id/documents` | multipart `file` → Cloudinary |
| DELETE | `/employees/:id/documents/:docId` | remove document |
| POST | `/employees/:id/avatar` | multipart `file` |

## Org structure

| Method | Path |
|--------|------|
| GET/POST | `/org/departments` (PATCH/DELETE `/org/departments/:id`) |
| GET/POST | `/org/designations` (DELETE `/org/designations/:id`) |

## Attendance

| Method | Path | Notes |
|--------|------|-------|
| POST | `/attendance/check-in` | `{ method, location, faceEmbedding?, employeeId? }` (MANUAL/GPS/QR/FACE) |
| POST | `/attendance/check-out` | `{ method, location }` → worked + overtime minutes |
| GET | `/attendance` | `?employeeId=&from=&to=&status=` |
| GET | `/attendance/today` | company roster summary |

## Leave

| Method | Path | Notes |
|--------|------|-------|
| POST | `/leaves` | `{ type, from, to, reason }` (checks balance) |
| GET | `/leaves` | `?status=&employeeId=` |
| PATCH | `/leaves/:id/decision` | `{ decision: 'APPROVED'|'REJECTED', note? }` |
| PATCH | `/leaves/:id/cancel` | cancel own request |
| GET | `/leaves/balance` | `?employeeId=&year=` |

## Payroll (manage = admin / HR)

| Method | Path | Notes |
|--------|------|-------|
| PUT | `/payroll/structure/:employeeId` | `{ basic, allowances[], deductions[], taxSlabs[], currency }` |
| GET | `/payroll/structure/:employeeId` | current structure |
| POST | `/payroll/generate` | `{ employeeId, month, year, bonus?, lopDays?, extraDeductions? }` |
| GET | `/payroll` | `?month=&year=&employeeId=` |
| GET | `/payroll/:id/payslip` | streams a PDF |
| POST | `/payroll/:id/mark-paid` | marks paid + notifies |

## Tasks & projects

| Method | Path |
|--------|------|
| GET/POST | `/tasks/projects` |
| GET/POST | `/tasks` (`?status=&project=&assignee=&mine=`) |
| PATCH | `/tasks/:id` (title, status, progress, assignees, dueDate, …) |
| DELETE | `/tasks/:id` |
| POST | `/tasks/:id/comments` `{ text }` |

## Dashboard, notifications, AI

| Method | Path | Notes |
|--------|------|-------|
| GET | `/dashboard` | role-adaptive (PLATFORM vs COMPANY scope) |
| GET | `/notifications` | `{ items, unread }` |
| PATCH | `/notifications/:id/read` | mark one |
| PATCH | `/notifications/read-all` | mark all |
| GET | `/ai/attendance-anomalies` | `?employeeId=` z-score outliers |
| POST | `/ai/assistant` | `{ question }` → `{ answer }` |
| GET | `/health` | liveness probe |
