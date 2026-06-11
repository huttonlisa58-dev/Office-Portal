import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
export function svc() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
}
export async function caller(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } }, auth: { persistSession: false },
  });
  const { data: { user } } = await anon.auth.getUser();
  if (!user) return null;
  const { data: profile } = await svc().from("profiles").select("*").eq("id", user.id).single();
  return { user, profile };
}

// Ensure an E.164-ish '+' prefix without guessing a country code.
export function e164(p?: string) {
  if (!p) return p as string;
  const s = String(p).trim();
  if (s.startsWith("+")) return s;
  const d = s.replace(/[^\d]/g, "");
  return d ? "+" + d : s;
}

// Twilio — accepts BOTH HRMS-native and KodaConnect var names, so the same
// credentials can be copied 1:1 between the two apps:
//   TWILIO_VERIFY_SERVICE_SID  ||  TWILIO_VERIFY_SID   (KodaConnect)
//   TWILIO_FROM                ||  TWILIO_PHONE_NUMBER (KodaConnect)
const TW_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TW_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TW_FROM = Deno.env.get("TWILIO_FROM") || Deno.env.get("TWILIO_PHONE_NUMBER");
const TW_MSGSID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
const TW_VERIFY = Deno.env.get("TWILIO_VERIFY_SERVICE_SID") || Deno.env.get("TWILIO_VERIFY_SID");
const basicAuth = () => "Basic " + btoa(`${TW_SID}:${TW_TOKEN}`);

export async function twilioSms(to: string, body: string) {
  if (!TW_SID || !TW_TOKEN || (!TW_FROM && !TW_MSGSID)) { console.log(`[twilio dev] SMS to ${to}: ${body}`); return { dev: true }; }
  const form = new URLSearchParams({ To: e164(to)!, Body: body });
  if (TW_MSGSID) form.set("MessagingServiceSid", TW_MSGSID); else form.set("From", TW_FROM!);
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TW_SID}/Messages.json`, {
    method: "POST", headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  return await r.json();
}

export async function twilioVerifyStart(to: string, channel = "sms") {
  if (!TW_SID || !TW_TOKEN || !TW_VERIFY) { console.log(`[twilio dev] OTP start -> ${to}`); return { status: "pending", dev: true }; }
  const form = new URLSearchParams({ To: e164(to)!, Channel: channel });
  const r = await fetch(`https://verify.twilio.com/v2/Services/${TW_VERIFY}/Verifications`, {
    method: "POST", headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  return await r.json();
}

export async function twilioVerifyCheck(to: string, code: string) {
  if (!TW_SID || !TW_TOKEN || !TW_VERIFY) { console.log(`[twilio dev] OTP check ${to} ${code}`); return { status: code === "000000" ? "approved" : "pending", dev: true }; }
  const form = new URLSearchParams({ To: e164(to)!, Code: code });
  const r = await fetch(`https://verify.twilio.com/v2/Services/${TW_VERIFY}/VerificationChecks`, {
    method: "POST", headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  return await r.json();
}
