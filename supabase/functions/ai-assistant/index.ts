import { cors, json, svc, caller } from "../_shared/util.ts";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-4-5-20251001";
const KEY = Deno.env.get("ANTHROPIC_API_KEY");

function fallback(q: string) {
  const t = q.toLowerCase();
  if (t.includes("leave")) return "Default annual balances are 12 casual, 10 sick and 15 earned days. Approvals deduct from the matching bucket.";
  if (t.includes("late") || t.includes("attendance")) return "Set a workday start and grace window in Settings \u2192 Work policy, enable GPS check-in, and review the Attendance roster daily.";
  if (t.includes("payroll") || t.includes("salary")) return "Set a salary structure per employee, then Generate payroll for a month. Tax is computed progressively from the slabs.";
  return "I can help with employees, leave, attendance and payroll. (Set ANTHROPIC_API_KEY on the project to enable full AI answers.)";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const c = await caller(req);
    if (!c || !c.profile) return json({ error: "Unauthorized" }, 401);
    const { question, history = [] } = await req.json();
    if (!question) return json({ error: "question required" }, 400);

    const db = svc();
    let context = `The user is ${c.profile.full_name || "a user"} with role ${c.profile.role}.`;
    if (c.profile.company_id) {
      const [{ data: company }, { count: emp }, { count: pending }] = await Promise.all([
        db.from("companies").select("name,plan,timezone,workday_start,late_after_minutes,full_day_hours").eq("id", c.profile.company_id).single(),
        db.from("employees").select("*", { count: "exact", head: true }).eq("company_id", c.profile.company_id).eq("status", "ACTIVE"),
        db.from("leaves").select("*", { count: "exact", head: true }).eq("company_id", c.profile.company_id).eq("status", "PENDING"),
      ]);
      if (company) context += ` Company "${company.name}" on the ${company.plan} plan, timezone ${company.timezone}, workday starts ${company.workday_start} with a ${company.late_after_minutes}-min grace and a ${company.full_day_hours}-hour full day. There are ${emp ?? 0} active employees and ${pending ?? 0} pending leave requests.`;
    }

    if (!KEY) return json({ answer: fallback(question), dev: true });

    const system = `You are the HR assistant inside an HRMS web app. Be concise, friendly and practical. Only answer HR/workspace questions (employees, attendance, leave, payroll, tasks, policies); gently redirect anything unrelated. Default leave policy when unset: 12 casual, 10 sick, 15 earned days per year. Workspace context: ${context}`;

    const messages = [
      ...((history as any[]) || []).slice(-8).map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.text || m.content || "") })),
      { role: "user", content: String(question) },
    ];

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 600, system, messages }),
    });
    if (!r.ok) { const err = await r.text(); return json({ answer: fallback(question), error: `LLM error ${r.status}`, detail: err.slice(0, 200) }); }
    const data = await r.json();
    const answer = (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim() || fallback(question);
    return json({ answer, model: MODEL });
  } catch (e) { return json({ error: String(e) }, 500); }
});
