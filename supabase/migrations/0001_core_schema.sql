-- HRMS core schema: extensions, enums, companies, profiles, employees, RLS helpers
create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('SUPER_ADMIN','COMPANY_ADMIN','HR','MANAGER','EMPLOYEE');
create type public.subscription_plan as enum ('FREE','STARTER','GROWTH','ENTERPRISE');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique, logo text, industry text, size text,
  timezone text not null default 'UTC', address text,
  plan public.subscription_plan not null default 'FREE', plan_seats int not null default 10,
  workday_start text not null default '09:00', late_after_minutes int not null default 15,
  full_day_hours int not null default 8, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger trg_companies_updated before update on public.companies for each row execute function public.set_updated_at();

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  full_name text not null default '', email text, phone text,
  role public.user_role not null default 'EMPLOYEE', employee_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index idx_profiles_company on public.profiles(company_id);
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.auth_company() returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid(); $$;
create or replace function public.auth_role() returns text language sql stable security definer set search_path = public as $$
  select role::text from public.profiles where id = auth.uid(); $$;
create or replace function public.is_super_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'SUPER_ADMIN' from public.profiles where id = auth.uid()), false); $$;
create or replace function public.is_company_manager() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('COMPANY_ADMIN','HR','MANAGER') from public.profiles where id = auth.uid()), false); $$;

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, created_at timestamptz not null default now());
create index idx_departments_company on public.departments(company_id);

create table public.designations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null, level int default 0, created_at timestamptz not null default now());
create index idx_designations_company on public.designations(company_id);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  employee_code text not null, first_name text not null, last_name text, email text, phone text,
  dob date, gender text, address text,
  department_id uuid references public.departments(id) on delete set null,
  designation_id uuid references public.designations(id) on delete set null,
  manager_id uuid references public.employees(id) on delete set null,
  date_of_joining date, employment_type text default 'FULL_TIME', status text not null default 'ACTIVE',
  documents jsonb not null default '[]',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (company_id, employee_code));
create index idx_employees_company on public.employees(company_id);
create trigger trg_employees_updated before update on public.employees for each row execute function public.set_updated_at();
alter table public.profiles add constraint fk_profiles_employee foreign key (employee_id) references public.employees(id) on delete set null;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.designations enable row level security;
alter table public.employees enable row level security;

create policy companies_read on public.companies for select using (public.is_super_admin() or id = public.auth_company());
create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_super_admin() or company_id = public.auth_company());
create policy departments_read on public.departments for select using (public.is_super_admin() or company_id = public.auth_company());
create policy designations_read on public.designations for select using (public.is_super_admin() or company_id = public.auth_company());
create policy employees_read on public.employees for select using (public.is_super_admin() or company_id = public.auth_company());
create policy departments_write on public.departments for all using (public.is_company_manager() and company_id = public.auth_company()) with check (company_id = public.auth_company());
create policy designations_write on public.designations for all using (public.is_company_manager() and company_id = public.auth_company()) with check (company_id = public.auth_company());
