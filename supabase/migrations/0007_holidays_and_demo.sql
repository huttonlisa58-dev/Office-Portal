-- Holidays table (dashboard "Upcoming holidays" widget) + demo colleagues/birthdays
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  date date not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_holidays_company_date on public.holidays(company_id, date);
alter table public.holidays enable row level security;
drop policy if exists holidays_read on public.holidays;
drop policy if exists holidays_write on public.holidays;
create policy holidays_read on public.holidays for select
  using (public.is_super_admin() or company_id = public.auth_company());
create policy holidays_write on public.holidays for all
  using (public.is_company_manager() and company_id = public.auth_company())
  with check (company_id = public.auth_company());

do $$
declare v_company uuid; v_dept uuid; v_desig uuid;
begin
  select id into v_company from public.companies where slug = 'acme';
  if v_company is null then return; end if;
  select id into v_dept from public.departments where company_id = v_company limit 1;
  select id into v_desig from public.designations where company_id = v_company limit 1;
  if not exists (select 1 from public.holidays where company_id = v_company) then
    insert into public.holidays (company_id, name, date) values
      (v_company,'Independence Day','2026-08-15'),(v_company,'Gandhi Jayanti','2026-10-02'),
      (v_company,'Diwali','2026-11-08'),(v_company,'Christmas','2026-12-25'),(v_company,'Republic Day','2027-01-26');
  end if;
  update public.employees set dob='1995-06-13', date_of_joining=current_date-20 where company_id=v_company and employee_code='ACME-0001';
  insert into public.employees (company_id, employee_code, first_name, last_name, email, department_id, designation_id, dob, date_of_joining, status) values
    (v_company,'ACME-0002','Deepak','Bisht','deepak@acme.io',v_dept,v_desig,'1992-06-12',current_date-5,'ACTIVE'),
    (v_company,'ACME-0003','Nishant','Khera','nishant@acme.io',v_dept,v_desig,'1998-09-21',current_date-12,'ACTIVE'),
    (v_company,'ACME-0004','Tushar','Tinoriya','tushar@acme.io',v_dept,v_desig,'1996-06-18',current_date-2,'ACTIVE'),
    (v_company,'ACME-0005','Vikash','Singh','vikash@acme.io',v_dept,v_desig,'1994-12-01',current_date-25,'ACTIVE')
  on conflict (company_id, employee_code) do nothing;
end $$;
