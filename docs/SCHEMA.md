# Data Model (MongoDB / Mongoose)

Multi-tenancy is **shared-database, shared-collection**: every tenant-scoped document
carries a `company` reference, and queries are filtered by it in middleware. SUPER_ADMIN
documents have `company: null`.

## Company
`name, slug (unique), logo, industry, size, timezone, address`
`workSettings { workdayStart, lateAfterMinutes, fullDayHours, weekends[] }`
`subscription { plan, status, seats, startedAt }` — plan ∈ FREE/STARTER/GROWTH/ENTERPRISE
`isActive`

## User
`company (null for SUPER_ADMIN), name, email, password (hashed, select:false)`
`role` ∈ SUPER_ADMIN | COMPANY_ADMIN | HR | MANAGER | EMPLOYEE
`employee (ref), isEmailVerified, isActive, lastLoginAt`
`otp { code, expiresAt } (select:false)`
**Index:** unique `{ company, email }`

## Department / Designation
Department: `company, name, head (Employee ref)`
Designation: `company, title, level`

## Employee
`company, user (ref), employeeId (e.g. ACME-0007)`
`firstName, lastName, email, phone, dob, gender, address`
`department (ref), designation (ref), manager (Employee ref)`
`dateOfJoining, employmentType, status`
`documents[] { label, url, publicId, uploadedAt }`
`faceEmbedding [Number] (select:false)` — for face-recognition attendance
**Virtual:** `fullName` · **Index:** unique `{ company, employeeId }`

## Attendance
`company, employee, date "YYYY-MM-DD"`
`checkIn { time, method, location {lat,lng}, note }`, `checkOut { … }`
`workedMinutes, overtimeMinutes, isLate, status`
`anomalyScore, anomalyReason`
method ∈ MANUAL/GPS/QR/FACE · status ∈ PRESENT/LATE/ABSENT/HALF_DAY
**Index:** unique `{ company, employee, date }`

## Leave & LeaveBalance
Leave: `company, employee, type, from, to, days, reason, status, approver, decisionNote`
status ∈ PENDING/APPROVED/REJECTED/CANCELLED
LeaveBalance: `company, employee, year, balances { CASUAL:12, SICK:10, EARNED:15 }`
**Index:** unique `{ company, employee, year }`

## SalaryStructure & Payroll
SalaryStructure: `company, employee (unique), basic, allowances[{label,amount}], deductions[{label,amount}], taxSlabs[{upTo,rate}], currency`
Payroll: `company, employee, month, year, basic, allowances[], deductions[], bonus, tax, gross, netPay, lopDays, status, payslip, generatedAt`
status ∈ DRAFT/GENERATED/PAID · **Index:** unique `{ company, employee, month, year }`

## Project & Task
Project: `company, name, description, owner, status`
Task: `company, title, description, project, assignees[], createdBy, priority, status, progress, dueDate, comments[{author,text,createdAt}]`
status ∈ TODO/IN_PROGRESS/REVIEW/DONE

## Notification
`user, company, type, title, body, isRead, createdAt`
