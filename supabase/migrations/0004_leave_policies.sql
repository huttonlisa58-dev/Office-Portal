-- Employees file/cancel their own leave from the client
create policy leaves_insert_own on public.leaves for insert
  with check (company_id = public.auth_company() and employee_id = (select employee_id from public.profiles where id = auth.uid()));
create policy leaves_cancel_own on public.leaves for update
  using (company_id = public.auth_company() and employee_id = (select employee_id from public.profiles where id = auth.uid()))
  with check (status = 'CANCELLED');
