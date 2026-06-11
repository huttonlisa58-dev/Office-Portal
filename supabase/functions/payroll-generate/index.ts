import { cors, json, svc, caller } from "../_shared/util.ts";

const sum = (a: any[]) => (a || []).reduce((s, x) => s + Number(x.amount || 0), 0);
function computeTax(taxable: number, slabs: any[]) {
  let tax = 0, prev = 0;
  for (const s of (slabs || []).slice().sort((a, b) => Number(a.upTo) - Number(b.upTo))) {
    const upTo = Number(s.upTo); const rate = Number(s.rate) / 100;
    if (taxable > prev) { tax += (Math.min(taxable, upTo) - prev) * rate; prev = upTo; }
  }
  return Number(tax.toFixed(2));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const c = await caller(req);
    if (!c || !c.profile) return json({ error: "Unauthorized" }, 401);
    if (!["COMPANY_ADMIN", "HR", "SUPER_ADMIN"].includes(c.profile.role)) return json({ error: "Forbidden" }, 403);
    const { employee_id, month, year, bonus = 0, lop_days = 0, extra_deductions = [] } = await req.json();
    if (!employee_id || !month || !year) return json({ error: "employee_id, month, year required" }, 400);
    const db = svc();
    const { data: emp } = await db.from("employees").select("id,company_id").eq("id", employee_id).single();
    if (!emp) return json({ error: "Employee not found" }, 404);
    if (c.profile.role !== "SUPER_ADMIN" && emp.company_id !== c.profile.company_id) return json({ error: "Forbidden" }, 403);
    const { data: st } = await db.from("salary_structures").select("*").eq("employee_id", employee_id).maybeSingle();
    if (!st) return json({ error: "Set a salary structure first" }, 400);

    const allDeductions = [...(st.deductions || []), ...extra_deductions];
    const perDay = Number(st.basic) / 30;
    const lopAmt = Number((perDay * Number(lop_days || 0)).toFixed(2));
    if (lopAmt > 0) allDeductions.push({ label: `Loss of pay (${lop_days}d)`, amount: lopAmt });
    const gross = Number(st.basic) + sum(st.allowances) + Number(bonus);
    const taxable = Number(st.basic) + sum(st.allowances);
    const tax = computeTax(taxable, st.tax_slabs);
    const net = Number((gross - sum(allDeductions) - tax).toFixed(2));
    const row = { company_id: emp.company_id, employee_id, month, year, currency: st.currency, basic: st.basic, allowances: st.allowances, deductions: allDeductions, bonus, tax, gross, net_pay: net, lop_days, status: "GENERATED", generated_at: new Date().toISOString() };
    const { data: pr, error } = await db.from("payrolls").upsert(row, { onConflict: "company_id,employee_id,month,year" }).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ payroll: pr, message: "Payroll generated" });
  } catch (e) { return json({ error: String(e) }, 500); }
});
