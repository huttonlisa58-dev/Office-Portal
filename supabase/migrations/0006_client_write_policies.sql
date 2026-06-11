-- Client-side writes for managers/admins (still company-scoped via RLS)
create policy companies_superadmin_all on public.companies for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy companies_admin_update on public.companies for update
  using (id = public.auth_company() and public.auth_role() = 'COMPANY_ADMIN') with check (id = public.auth_company());
create policy employees_write on public.employees for all
  using (public.is_company_manager() and company_id = public.auth_company()) with check (company_id = public.auth_company());
create policy salary_write on public.salary_structures for all
  using (public.is_company_manager() and company_id = public.auth_company()) with check (company_id = public.auth_company());
create policy payrolls_update on public.payrolls for update
  using (public.is_company_manager() and company_id = public.auth_company()) with check (company_id = public.auth_company());
