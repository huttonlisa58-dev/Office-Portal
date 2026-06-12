-- Attendance regularization requests: employee manual entry -> request -> HR/Manager approval
create table if not exists public.attendance_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  check_in timestamptz not null,
  check_out timestamptz,
  remarks text,
  status text not null default 'PENDING',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.attendance_requests enable row level security;

drop policy if exists ar_insert on public.attendance_requests;
create policy ar_insert on public.attendance_requests for insert to authenticated
  with check (company_id = public.auth_company());

drop policy if exists ar_select on public.attendance_requests;
create policy ar_select on public.attendance_requests for select to authenticated
  using (public.is_super_admin() or (company_id = public.auth_company() and (
    public.auth_role() in ('COMPANY_ADMIN','HR','MANAGER')
    or employee_id = (select employee_id from public.profiles where id = auth.uid()))));

-- notify trigger + decide RPC are defined in the live migration (see project history).
