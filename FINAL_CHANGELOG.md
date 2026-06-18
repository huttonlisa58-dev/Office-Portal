# FINAL_CHANGELOG.md

Repository: Office-Portal (Multi-Tenant HRMS — Next.js 14 + Supabase/PostgreSQL)
Audit scope: security (multi-tenant isolation), RBAC, dashboard, attendance, error handling.

> Honesty note: This was a focused, verifiable pass — not an automated rewrite of every file across
> all 10 requested phases. Each item below was actually checked against the live database / source.
> Large remaining items are listed in "Not done in this pass" with rationale, so nothing is misrepresented as complete.

---

## PHASE 1 — Multi-Tenant Security Audit (RLS) — VERIFIED ✅ (no changes required)

**Method:** queried `pg_class` / `pg_policy` for all 61 public tables.

**Findings:**
- **RLS is enabled on every table** (the only table without a `company_id` is `companies` itself, which is the tenant root — correct).
- **Every SELECT/UPDATE/DELETE policy is scoped** by `company_id = auth_company()`, `auth.uid()` ownership, or `is_super_admin()`. No policy uses `USING (true)` or an unscoped predicate.
- **Every INSERT policy enforces `WITH CHECK (company_id = auth_company())`** (the `USING` clause is `NULL` for INSERT by design — this is correct, not a bug). Sensitive child tables (`bank_details`, `salary_revisions`, `loans`, `statutory_details`, etc.) additionally gate by role/self.
- Security-definer helpers verified: `auth_company()` = caller's `profiles.company_id`; `is_company_manager()` = role ∈ (COMPANY_ADMIN, HR, MANAGER); `is_super_admin()` = role = SUPER_ADMIN.
- `employee_full_profile()` RPC raises `Not authorized` unless `is_super_admin()` OR same-company admin/HR/manager OR self.

**Conclusion:** No multi-tenant data leak, no missing `company_id` filter at the data layer, no `RLS off` table, no unscoped policy. Client queries that omit an explicit `company_id` filter are still safe because RLS enforces isolation server-side. **Severity of issues found: none.**

---

## PHASE 2 — Authentication & RBAC — AUDITED ✅

**Frontend role gates audited** across all pages/components. `COMPANY_ADMIN` is included in every company-management gate; `MANAGER`/`HR` where appropriate; platform-only routes (`/companies`) restricted to `SUPER_ADMIN`.

**Effective permission matrix (enforced by RLS + UI):**

| Module | SUPER_ADMIN | COMPANY_ADMIN | HR | MANAGER | EMPLOYEE |
|---|---|---|---|---|---|
| Companies (all tenants) | ✓ | ✗ | ✗ | ✗ | ✗ |
| Employees CRUD | ✓ | ✓ | ✓ | view | self |
| Org (Dept/Desig/Locations) | platform | ✓ | ✓ | view | view |
| Shifts / Work policy | — | ✓ | ✓ | ✗ | ✗ |
| Leave/Timesheet/Expense approve | ✓ | ✓ | ✓ | ✓ | own only |
| Payroll | ✓ | ✓ | ✓ | ✗ | own payslip |
| Sensitive profile (bank/salary) | ✓ | ✓ | ✓ | ✓(same co) | self |

Authorization is enforced **server-side via Supabase RLS** (not just hidden UI), and privileged mutations (employee login reset, leave decision) run through **Edge Functions** that re-check the caller's role.

---

## PHASE 3 — Dashboard — FIXED ✅

1. **`present today` counted the wrong day (timezone bug).** `getDashboard()` queried the `attendance` table using a **UTC** date while the punch system (`attendance_punches`) used the **IST** date — the two could resolve to different calendar days (notably in early-morning IST), producing wrong present/late/absent counts.
   - Fix: both queries now use the company timezone (default `Asia/Kolkata`) so the day is consistent.
   - File: `client/src/lib/db.js` (`getDashboard`).
2. **Leave-availability bar could overflow past 100%.** `pct = (left/quota)*100` was uncapped, so a balance above the hardcoded quota rendered a bar wider than its track.
   - Fix: `pct` clamped to `0–100` + `overflow-hidden` on the track.
   - File: `client/src/app/(app)/dashboard/page.js`.
3. **No error boundary → a widget crash blanked the whole app.**
   - Fix: added a Next.js route-level error boundary with a friendly message and a **Try again** (`reset()`) button.
   - File: `client/src/app/(app)/error.js` (new).

Loading states (`<Loader />`) and empty states (`<Empty />`) already existed on the dashboard and were verified.

---

## PHASE 4 — Attendance — FIXED ✅ (timezone)

The present/absent miscount above stemmed from the attendance date-resolution bug; the unified-timezone fix in `getDashboard()` corrects the dashboard counts. Punch + legacy-attendance present counts are de-duplicated via a `Set` of `employee_id` (no double counting).

---

## Earlier fixes in this engagement (already deployed)

- **Inbox tab scoping**: `My requests`/`Awaiting`/`Completed` now scope to the logged-in user; non-approvers no longer saw colleagues' requests.
- **Leave detail pane**: reference-style fields (Leave type, Applied on, Leave applied for, Reason, Approver(s), Decision taken by, decision date). Added `leaves.decided_at` column + `approver_id` FK and a `leave_approvers()` RPC.
- **Profile page**: accounts without an employee record (Super Admin) now show an account card instead of an empty message.
- **New modules**: Departments, Designations, Office Locations (Organization menu) and Shifts management (Settings) — all company-scoped via existing RLS.
- **Dashboard stats**: company stat cards (Employees / Present / Pending leaves / Departments / Payroll) for HR/Admin/Manager.

---

## Not done in this pass (honest status + rationale)

These are genuine, sizable pieces of work. They were **not** auto-generated here because doing so blindly (without iterative testing) would risk regressing a live, working app — and several need product decisions.

- **Phase 5 — Payroll DB aggregation for 10k+ employees**: current payroll sums are computed per-run; moving to SQL-side aggregation needs a tested RPC. *Recommended next.*
- **Phase 6 — Performance (N+1, caching, pagination)**: employees list already paginates; a full N+1/caching pass needs profiling.
- **Phase 7 — Skeletons / toasts everywhere**: spinners + inline messages exist today; a global toast system is a separate addition.
- **Phase 8 — Full audit logging**: an `activity_logs` table (RLS-scoped) already exists; wiring a write on every mutation (create/update/delete/approve/login) needs Edge-Function-level hooks.
- **Phase 9 — New modules**: Recruitment / Interviews / Offer letters / Training / Document management require new tables + RLS + UI.
- **Phase 2 — Editable RBAC matrix UI**: a `roles`/`permissions` table exists; a UI to edit per-module View/Create/Edit/Delete/Approve/Export + enforcement is a dedicated build.

---

## Recommended production checklist

- [x] RLS enabled + company-scoped on all tables (verified)
- [x] Privileged mutations behind Edge Functions with server-side role checks
- [x] App-segment error boundary
- [x] Dashboard timezone correctness
- [ ] Rotate the GitHub PAT used for deploys (shared in chat) and any Twilio keys committed in edge-function source
- [ ] Move hardcoded leave quotas to a `leave_policies`-driven value
- [ ] Add audit-log writes to mutating Edge Functions
- [ ] Payroll aggregation RPC + load test at 10k employees
