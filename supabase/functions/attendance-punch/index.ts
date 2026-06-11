import { cors, json, svc, caller } from "../_shared/util.ts";

const todayInTz = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
function minsSinceMidnight(d: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  return (+p.find((x) => x.type === "hour")!.value) * 60 + (+p.find((x) => x.type === "minute")!.value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const c = await caller(req);
    if (!c || !c.profile) return json({ error: "Unauthorized" }, 401);
    const db = svc();
    const b = await req.json();
    const isMgr = ["COMPANY_ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(c.profile.role);
    const employeeId = b.employee_id || c.profile.employee_id;
    if (!employeeId) return json({ error: "No employee linked to this account" }, 400);

    const { data: emp } = await db.from("employees").select("id,company_id").eq("id", employeeId).single();
    if (!emp) return json({ error: "Employee not found" }, 404);
    if (emp.company_id !== c.profile.company_id && c.profile.role !== "SUPER_ADMIN") return json({ error: "Forbidden" }, 403);
    if (b.employee_id && b.employee_id !== c.profile.employee_id && !isMgr) return json({ error: "Forbidden" }, 403);

    const { data: company } = await db.from("companies").select("*").eq("id", emp.company_id).single();
    const tz = company.timezone || "UTC";
    const date = todayInTz(tz);
    const now = new Date();
    const { data: existing } = await db.from("attendance").select("*").eq("company_id", emp.company_id).eq("employee_id", employeeId).eq("work_date", date).maybeSingle();

    if (b.action === "check-out") {
      if (!existing || !existing.check_in_at) return json({ error: "No check-in found for today" }, 400);
      if (existing.check_out_at) return json({ error: "Already checked out" }, 409);
      const worked = Math.max(0, Math.round((now.getTime() - new Date(existing.check_in_at).getTime()) / 60000));
      const full = (company.full_day_hours || 8) * 60;
      const ot = Math.max(0, worked - full);
      const status = worked < full / 2 ? "HALF_DAY" : existing.status;
      const { data: upd } = await db.from("attendance").update({ check_out_at: now.toISOString(), check_out_method: b.method || "MANUAL", worked_minutes: worked, overtime_minutes: ot, status }).eq("id", existing.id).select().single();
      return json({ attendance: upd, message: "Checked out" });
    }

    if (existing && existing.check_in_at) return json({ error: "Already checked in today" }, 409);
    const [sh, sm] = String(company.workday_start || "09:00").split(":").map(Number);
    const lateAfter = sh * 60 + sm + (company.late_after_minutes ?? 15);
    const isLate = minsSinceMidnight(now, tz) > lateAfter;
    const row = { company_id: emp.company_id, employee_id: employeeId, work_date: date, check_in_at: now.toISOString(), check_in_method: b.method || "MANUAL", check_in_location: b.location || null, is_late: isLate, status: isLate ? "LATE" : "PRESENT" };
    const { data: ins } = await db.from("attendance").upsert(row, { onConflict: "company_id,employee_id,work_date" }).select().single();
    return json({ attendance: ins, message: isLate ? "Checked in (late)" : "Checked in" });
  } catch (e) { return json({ error: String(e) }, 500); }
});
