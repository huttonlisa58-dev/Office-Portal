# HRMS on Supabase + Twilio

This backend is **live**. The HRMS now runs on Supabase (Postgres + Auth + Edge
Functions) with Twilio for SMS OTP and notifications. The Next.js client talks
directly to Supabase via `@supabase/supabase-js` (reads are guarded by
Row-Level Security) and calls Edge Functions for business logic.

## Live project

| | |
|---|---|
| Project name | `hrms-platform` |
| Project ref | `knrgexuoewfywknuytos` |
| API URL | `https://knrgexuoewfywknuytos.supabase.co` |
| Region | `ap-south-1` (Mumbai) |
| Anon (publishable) key | `sb_publishable_AKgR4ESTSpnC0ZkwJA9GWA_u8sRcucb` |
| Plan | Free ($0/month) |

The anon key is safe to expose in the browser — every table is protected by RLS.
Keep the **service-role key** (Dashboard → Settings → API) secret; it is only
used server-side inside Edge Functions and is injected automatically by Supabase.

## Seeded login accounts

| Email | Password | Role |
|---|---|---|
| `admin@hrms.io` | `Admin@12345` | SUPER_ADMIN (platform) |
| `admin@acme.io` | `Acme@12345` | COMPANY_ADMIN (Acme Inc) |
| `hr@acme.io` | `Acme@12345` | HR |
| `jane@acme.io` | `Acme@12345` | EMPLOYEE |

## Frontend environment

`client/.env.local` (already created for local dev):

```
NEXT_PUBLIC_SUPABASE_URL=https://knrgexuoewfywknuytos.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_AKgR4ESTSpnC0ZkwJA9GWA_u8sRcucb
```

Run locally:

```bash
cd client
npm install
npm run dev      # http://localhost:3000
```

## Twilio configuration (required for real SMS)

The Edge Functions degrade gracefully without Twilio — they log the message to
the function console (`[twilio dev] ...`) instead of sending. To send real
messages, set these **function secrets** on the project:

```bash
# install once: npm i -g supabase ; supabase login ; supabase link --project-ref knrgexuoewfywknuytos
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxx \
  TWILIO_AUTH_TOKEN=xxxxxxxx \
  TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxx \
  TWILIO_FROM=+1XXXXXXXXXX
# OR use a Messaging Service instead of TWILIO_FROM:
# supabase secrets set TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxx
```

For the AI assistant, also set an Anthropic key (optional — without it the chat
uses a built-in helper):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
# optional model override (default claude-haiku-4-5-20251001):
# supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6
```

You can also set all of these in the Dashboard → Edge Functions → Secrets. No
redeploy is needed; functions read secrets at runtime.

- **OTP** uses Twilio **Verify** (`TWILIO_VERIFY_SERVICE_SID`). Create a Verify
  Service in the Twilio Console first.
- **Notifications** use Programmable Messaging (`TWILIO_FROM` or
  `TWILIO_MESSAGING_SERVICE_SID`).

## Edge Functions (deployed, `verify_jwt = true`)

| Function | Purpose | Twilio |
|---|---|---|
| `twilio-otp` | Start/check phone OTP (`{action:'start'|'check', phone, code}`) | Verify |
| `attendance-punch` | Check-in/out, timezone-aware late + overtime calc | — |
| `leave-decision` | Approve/reject, deduct balance, notify employee | SMS |
| `payroll-generate` | Progressive tax, gross/net, LOP proration, upsert | — |
| `create-employee` | Seat-limit check, auto employee code, optional login | — |
| `ai-assistant` | Workspace-aware HR chat via the Anthropic API (falls back to a built-in helper without a key) | — |

Redeploy any function (after editing under `supabase/functions/`):

```bash
supabase functions deploy attendance-punch --project-ref knrgexuoewfywknuytos
```

> The deployed bundles inline `_shared/util.ts` as `./util.ts`. If you deploy
> from this repo with the CLI, the `../_shared/util.ts` import resolves fine.

## Database

Schema is in `supabase/migrations/` (apply in order with `supabase db push` on a
fresh project, or copy into the SQL editor):

- `0001_core_schema.sql` — companies, profiles, employees, RLS helpers + policies
- `0002_ops_schema.sql` — attendance, leaves, balances, salary, payroll, tasks, notifications
- `0003_seed.sql` — demo tenant + 4 auth accounts
- `0004_leave_policies.sql` — employees file/cancel own leave
- `0005_harden.sql` — pin `set_updated_at` search_path
- `0006_client_write_policies.sql` — manager/admin client-side writes

**Multi-tenancy:** every table carries `company_id`; RLS restricts rows to the
caller's company. SECURITY DEFINER helpers (`auth_company()`, `auth_role()`,
`is_super_admin()`, `is_company_manager()`) read the caller's profile without
recursing. Privileged writes (auth user creation, balance deduction, tax calc)
run in Edge Functions with the service-role key, which bypasses RLS.

## Deploy the frontend to Vercel

The Vercel connector cannot push local files, so deploy from your machine:

```bash
cd client
npm i -g vercel
vercel            # follow prompts; set root to the client folder
# then add the two NEXT_PUBLIC_ env vars in the Vercel dashboard and redeploy
vercel --prod
```

Or push the repo to GitHub and import it in Vercel (Root Directory = `client`,
add the two `NEXT_PUBLIC_SUPABASE_*` env vars).

## Security advisors (current — all WARN, none critical)

Run `get_advisors` anytime after schema changes. Outstanding notices:

1. **SECURITY DEFINER helpers callable via RPC** (`auth_company`, `auth_role`,
   `is_super_admin`, `is_company_manager`). These only ever return the *caller's
   own* role/company, so the risk is low. To remove the warning entirely, move
   them into a `private` schema not exposed by PostgREST and update the policies.
2. **Leaked-password protection disabled.** Enable in Dashboard → Authentication
   → Policies (checks new passwords against HaveIBeenPwned).

## What is complete vs. scaffolded

- **Complete & live:** auth + RLS, employees, departments/designations,
  attendance (check-in/out, late/OT), leave (apply/cancel/approve with balance),
  payroll (salary structure, tax, generate, mark-paid), tasks board, companies +
  plans, notifications, dashboards, reports/CSV, client-side payslip (print →
  Save as PDF), z-score attendance-anomaly detection.
  z-score attendance-anomaly detection, and **AI chat** via the `ai-assistant`
  Edge Function (set `ANTHROPIC_API_KEY` for full LLM answers; a built-in helper
  responds otherwise).
- **Scaffolded / optional next steps:** WhatsApp channel for OTP/notifications
  (swap `channel: 'whatsapp'` and configure a WhatsApp sender), face-recognition
  check-in.

## Twilio secrets (shared with KodaConnect)

The HRMS edge functions read Twilio credentials from **Supabase function secrets**
on the `hrms-platform` project. They accept **both** the HRMS-native names and the
exact names used by KodaConnect, so you can copy the same 4 values 1:1:

| Purpose            | HRMS name                  | KodaConnect name (also accepted) |
|--------------------|----------------------------|----------------------------------|
| Account SID        | `TWILIO_ACCOUNT_SID`       | `TWILIO_ACCOUNT_SID`             |
| Auth token         | `TWILIO_AUTH_TOKEN`        | `TWILIO_AUTH_TOKEN`              |
| Verify service SID | `TWILIO_VERIFY_SERVICE_SID`| `TWILIO_VERIFY_SID`              |
| From number        | `TWILIO_FROM`              | `TWILIO_PHONE_NUMBER`            |

The real values are **not** stored in any repo (KodaConnect only ships `.env.example`).
Copy them from your KodaConnect deployment env (e.g. Vercel project → Settings →
Environment Variables) and set them on the HRMS Supabase project:

```bash
# CLI (project linked):
supabase secrets set \
  TWILIO_ACCOUNT_SID=ACxxxxxxxx \
  TWILIO_AUTH_TOKEN=xxxxxxxx \
  TWILIO_VERIFY_SID=VAxxxxxxxx \
  TWILIO_PHONE_NUMBER=+1xxxxxxxxxx \
  --project-ref knrgexuoewfywknuytos
```

Or dashboard: hrms-platform → Edge Functions → **Secrets** → add the 4 keys.
One Twilio account can power both apps. Functions fall back to a safe dev-mode
(console log, no real SMS) when the secrets are absent.
