-- Manual check-in/check-out entries: remarks column + delete policy
alter table public.attendance_punches add column if not exists remarks text;

drop policy if exists punches_delete on public.attendance_punches;
create policy punches_delete on public.attendance_punches for delete to authenticated
using (
  public.is_super_admin()
  or (company_id = public.auth_company() and public.auth_role() in ('COMPANY_ADMIN','HR','MANAGER'))
  or (company_id = public.auth_company() and employee_id = (select employee_id from public.profiles where id = auth.uid()))
);
