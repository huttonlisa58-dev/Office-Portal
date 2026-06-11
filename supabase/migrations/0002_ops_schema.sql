-- HRMS operational schema: attendance, leaves, payroll, projects, tasks, notifications
create type public.leave_status as enum ('PENDING','APPROVED','REJECTED','CANCELLED');
create type public.attendance_status as enum ('PRESENT','LATE','ABSENT','HALF_DAY');
create type public.payroll_status as enum ('DRAFT','GENERATED','PAID');
create type public.task_status as enum ('TODO','IN_PROGRESS','REVIEW','DONE');

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null, check_in_at timestamptz, check_in_method text, check_in_location jsonb,
  check_out_at timestamptz, check_out_method text, worked_minutes int default 0, overtime_minutes int default 0,
  is_late boolean default false, status public.attendance_status not null default 'PRESENT',
  anomaly_score numeric, anomaly_reason text, created_at timestamptz not null default now(),
  unique (company_id, employee_id, work_date));
create index idx_attendance_company_date on public.attendance(company_id, work_date);

create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null default 'CASUAL', from_date date not null, to_date date not null,
  days int not null, reason text, status public.leave_status not null default 'PENDING',
  approver_id uuid references public.employees(id) on delete set null, decision_note text,
  created_at timestamptz not null default now());
create index idx_leaves_company on public.leaves(company_id);

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  year int not null, casual int not null default 12, sick int not null default 10, earned int not null default 15,
  unique (company_id, employee_id, year));

create table public.salary_structures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  basic numeric not null default 0, allowances jsonb not null default '[]', deductions jsonb not null default '[]',
  tax_slabs jsonb not null default '[]', currency text not null default 'USD',
  unique (company_id, employee_id));

create table public.payrolls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  month int not null, year int not null, currency text not null default 'USD',
  basic numeric not null default 0, allowances jsonb not null default '[]', deductions jsonb not null default '[]',
  bonus numeric not null default 0, tax numeric not null default 0, gross numeric not null default 0,
  net_pay numeric not null default 0, lop_days numeric not null default 0,
  status public.payroll_status not null default 'GENERATED', generated_at timestamptz not null default now(),
  unique (company_id, employee_id, month, year));
create index idx_payrolls_company on public.payrolls(company_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, description text, owner_id uuid references public.employees(id) on delete set null,
  status text default 'ACTIVE', created_at timestamptz not null default now());

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null, description text, assignees uuid[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  priority text default 'MEDIUM', status public.task_status not null default 'TODO', progress int not null default 0,
  due_date date, comments jsonb not null default '[]',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index idx_tasks_company on public.tasks(company_id);
create trigger trg_tasks_updated before update on public.tasks for each row execute function public.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text, title text not null, body text, is_read boolean not null default false,
  created_at timestamptz not null default now());
create index idx_notifications_user on public.notifications(user_id, is_read);

alter table public.attendance enable row level security;
alter table public.leaves enable row level security;
alter table public.leave_balances enable row level security;
alter table public.salary_structures enable row level security;
alter table public.payrolls enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;

create policy attendance_read on public.attendance for select using (public.is_super_admin() or company_id = public.auth_company());
create policy leaves_read on public.leaves for select using (public.is_super_admin() or company_id = public.auth_company());
create policy leave_balances_read on public.leave_balances for select using (public.is_super_admin() or company_id = public.auth_company());
create policy salary_structures_read on public.salary_structures for select using (public.is_super_admin() or company_id = public.auth_company());
create policy payrolls_read on public.payrolls for select using (public.is_super_admin() or company_id = public.auth_company());
create policy projects_read on public.projects for select using (public.is_super_admin() or company_id = public.auth_company());
create policy tasks_read on public.tasks for select using (public.is_super_admin() or company_id = public.auth_company());
create policy notifications_read on public.notifications for select using (user_id = auth.uid());
create policy projects_write on public.projects for all using (public.is_company_manager() and company_id = public.auth_company()) with check (company_id = public.auth_company());
create policy tasks_write on public.tasks for all using (company_id = public.auth_company()) with check (company_id = public.auth_company());
create policy notifications_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
