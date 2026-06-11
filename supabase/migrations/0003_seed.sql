-- Demo tenant + seeded auth users. Passwords hashed with bcrypt via pgcrypto.
-- Accounts: admin@hrms.io/Admin@12345 (SUPER_ADMIN); admin@acme.io, hr@acme.io, jane@acme.io / Acme@12345
do $$
declare
  v_company uuid := gen_random_uuid(); v_dept uuid := gen_random_uuid();
  v_desig uuid := gen_random_uuid(); v_emp uuid := gen_random_uuid();
  u_super uuid := gen_random_uuid(); u_admin uuid := gen_random_uuid();
  u_hr uuid := gen_random_uuid(); u_jane uuid := gen_random_uuid();
begin
  insert into public.companies (id, name, slug, plan, plan_seats, timezone)
  values (v_company, 'Acme Inc', 'acme', 'GROWTH', 250, 'Asia/Kolkata');
  insert into public.departments (id, company_id, name) values (v_dept, v_company, 'Engineering');
  insert into public.designations (id, company_id, title, level) values (v_desig, v_company, 'Senior Engineer', 3);

  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values
    (u_super,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@hrms.io', extensions.crypt('Admin@12345', extensions.gen_salt('bf')), now(),'{"provider":"email","providers":["email"]}','{"full_name":"Platform Admin"}', now(), now(),'','','',''),
    (u_admin,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@acme.io', extensions.crypt('Acme@12345', extensions.gen_salt('bf')), now(),'{"provider":"email","providers":["email"]}','{"full_name":"Acme Admin"}', now(), now(),'','','',''),
    (u_hr,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','hr@acme.io', extensions.crypt('Acme@12345', extensions.gen_salt('bf')), now(),'{"provider":"email","providers":["email"]}','{"full_name":"Acme HR"}', now(), now(),'','','',''),
    (u_jane,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','jane@acme.io', extensions.crypt('Acme@12345', extensions.gen_salt('bf')), now(),'{"provider":"email","providers":["email"]}','{"full_name":"Jane Doe"}', now(), now(),'','','','');

  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), u_super, u_super::text, 'email', jsonb_build_object('sub',u_super::text,'email','admin@hrms.io','email_verified',true), now(), now(), now()),
    (gen_random_uuid(), u_admin, u_admin::text, 'email', jsonb_build_object('sub',u_admin::text,'email','admin@acme.io','email_verified',true), now(), now(), now()),
    (gen_random_uuid(), u_hr, u_hr::text, 'email', jsonb_build_object('sub',u_hr::text,'email','hr@acme.io','email_verified',true), now(), now(), now()),
    (gen_random_uuid(), u_jane, u_jane::text, 'email', jsonb_build_object('sub',u_jane::text,'email','jane@acme.io','email_verified',true), now(), now(), now());

  insert into public.employees (id, company_id, user_id, employee_code, first_name, last_name, email, department_id, designation_id, date_of_joining, status)
  values (v_emp, v_company, u_jane, 'ACME-0001','Jane','Doe','jane@acme.io', v_dept, v_desig, current_date, 'ACTIVE');

  insert into public.profiles (id, company_id, full_name, email, role, employee_id) values
    (u_super, null, 'Platform Admin','admin@hrms.io','SUPER_ADMIN', null),
    (u_admin, v_company, 'Acme Admin','admin@acme.io','COMPANY_ADMIN', null),
    (u_hr, v_company, 'Acme HR','hr@acme.io','HR', null),
    (u_jane, v_company, 'Jane Doe','jane@acme.io','EMPLOYEE', v_emp);

  insert into public.leave_balances (company_id, employee_id, year)
  values (v_company, v_emp, extract(year from current_date)::int);
end $$;
