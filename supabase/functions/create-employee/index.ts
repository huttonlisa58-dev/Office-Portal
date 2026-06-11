import { cors, json, svc, caller } from "../_shared/util.ts";

const SEATS: Record<string, number> = { FREE: 10, STARTER: 50, GROWTH: 250, ENTERPRISE: 100000 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const c = await caller(req);
    if (!c || !c.profile) return json({ error: "Unauthorized" }, 401);
    if (!["COMPANY_ADMIN", "HR", "SUPER_ADMIN"].includes(c.profile.role)) return json({ error: "Forbidden" }, 403);
    const b = await req.json();
    const companyId = c.profile.role === "SUPER_ADMIN" && b.company_id ? b.company_id : c.profile.company_id;
    if (!companyId) return json({ error: "No company context" }, 400);
    if (!b.first_name) return json({ error: "first_name required" }, 400);
    const db = svc();
    const { data: company } = await db.from("companies").select("*").eq("id", companyId).single();
    const { count } = await db.from("employees").select("*", { count: "exact", head: true }).eq("company_id", companyId);
    const limit = SEATS[company.plan] ?? 10;
    if ((count || 0) >= limit) return json({ error: `Seat limit reached for ${company.plan} plan` }, 402);
    const code = b.employee_code || `${String(company.slug).slice(0, 4).toUpperCase()}-${String((count || 0) + 1).padStart(4, "0")}`;

    let userId: string | null = null;
    if (b.create_login && b.email) {
      const { data: created, error } = await db.auth.admin.createUser({ email: b.email, password: b.password || "Welcome@123", email_confirm: true, user_metadata: { full_name: `${b.first_name} ${b.last_name || ""}`.trim() } });
      if (error) return json({ error: error.message }, 400);
      userId = created.user.id;
    }
    const { data: emp, error: e2 } = await db.from("employees").insert({ company_id: companyId, user_id: userId, employee_code: code, first_name: b.first_name, last_name: b.last_name, email: b.email, phone: b.phone, department_id: b.department_id || null, designation_id: b.designation_id || null, employment_type: b.employment_type || "FULL_TIME" }).select().single();
    if (e2) return json({ error: e2.message }, 400);
    if (userId) {
      await db.from("profiles").insert({ id: userId, company_id: companyId, full_name: `${b.first_name} ${b.last_name || ""}`.trim(), email: b.email, phone: b.phone, role: "EMPLOYEE", employee_id: emp.id });
      const yr = new Date().getFullYear();
      await db.from("leave_balances").insert({ company_id: companyId, employee_id: emp.id, year: yr });
    }
    return json({ employee: emp, message: "Employee created" });
  } catch (e) { return json({ error: String(e) }, 500); }
});
