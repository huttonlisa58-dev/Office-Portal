import { cors, json, svc, caller, twilioSms } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const c = await caller(req);
    if (!c || !c.profile) return json({ error: "Unauthorized" }, 401);
    if (!["COMPANY_ADMIN", "HR", "MANAGER", "SUPER_ADMIN"].includes(c.profile.role)) return json({ error: "Forbidden" }, 403);
    const { leave_id, decision, note } = await req.json();
    if (!leave_id || !["APPROVED", "REJECTED"].includes(decision)) return json({ error: "leave_id and valid decision required" }, 400);
    const db = svc();
    const { data: leave } = await db.from("leaves").select("*").eq("id", leave_id).single();
    if (!leave) return json({ error: "Leave not found" }, 404);
    if (c.profile.role !== "SUPER_ADMIN" && leave.company_id !== c.profile.company_id) return json({ error: "Forbidden" }, 403);
    if (leave.status !== "PENDING") return json({ error: "Already decided" }, 409);

    if (decision === "APPROVED" && ["CASUAL", "SICK", "EARNED"].includes(leave.leave_type)) {
      const yr = new Date(leave.from_date).getFullYear();
      const col = leave.leave_type.toLowerCase();
      const { data: bal } = await db.from("leave_balances").select("*").eq("company_id", leave.company_id).eq("employee_id", leave.employee_id).eq("year", yr).maybeSingle();
      if (bal) {
        if (Number(bal[col]) < leave.days) return json({ error: `Insufficient ${leave.leave_type} balance (${bal[col]} left)` }, 400);
        await db.from("leave_balances").update({ [col]: Number(bal[col]) - leave.days }).eq("id", bal.id);
      }
    }

    const { data: upd } = await db.from("leaves").update({ status: decision, decision_note: note || null, approver_id: c.profile.employee_id || null }).eq("id", leave.id).select().single();
    const { data: emp } = await db.from("employees").select("user_id,first_name,phone").eq("id", leave.employee_id).single();
    if (emp?.user_id) {
      await db.from("notifications").insert({ company_id: leave.company_id, user_id: emp.user_id, type: "LEAVE", title: `Leave ${decision.toLowerCase()}`, body: `Your ${leave.leave_type} leave (${leave.from_date} \u2192 ${leave.to_date}) was ${decision.toLowerCase()}.` });
    }
    if (emp?.phone) await twilioSms(emp.phone, `Hi ${emp.first_name}, your ${leave.leave_type} leave was ${decision.toLowerCase()}.`);
    return json({ leave: upd, message: `Leave ${decision.toLowerCase()}` });
  } catch (e) { return json({ error: String(e) }, 500); }
});
