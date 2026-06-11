import { cors, json, caller, twilioVerifyStart, twilioVerifyCheck } from "../_shared/util.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const c = await caller(req);
    if (!c) return json({ error: "Unauthorized" }, 401);
    const { action, phone, code, channel } = await req.json();
    if (!phone) return json({ error: "phone required" }, 400);
    if (action === "check") {
      const res = await twilioVerifyCheck(phone, code || "");
      return json({ status: res.status, approved: res.status === "approved" });
    }
    const res = await twilioVerifyStart(phone, channel || "sms");
    return json({ status: res.status, dev: res.dev || false });
  } catch (e) { return json({ error: String(e) }, 500); }
});
