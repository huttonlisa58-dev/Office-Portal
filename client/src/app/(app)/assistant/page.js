'use client';
import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Activity, Sparkles } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { employees as empApi, assistant } from '@/lib/db';
import { supabase } from '@/lib/supabaseClient';

const SUGGESTIONS = [
  'How many employees are active?',
  'Summarize our leave policy basics.',
  'Tips to reduce late check-ins.',
];

// Offline fallback used only if the ai-assistant edge function is unreachable.
async function localAnswer(q) {
  const t = q.toLowerCase();
  if (t.includes('how many') && (t.includes('employee') || t.includes('active'))) {
    const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
    return `You currently have ${count ?? 0} active employee${count === 1 ? '' : 's'} in your workspace.`;
  }
  if (t.includes('leave')) {
    return 'Default annual leave balances are 12 casual, 10 sick and 15 earned days per employee. Approvals deduct from the matching bucket; rejected or cancelled requests do not. Managers and HR can approve from the Leave page.';
  }
  if (t.includes('late') || t.includes('check-in') || t.includes('attendance')) {
    return 'To reduce late check-ins: set a clear workday start and grace window in Settings → Work policy, enable GPS check-in, and review the Attendance roster daily. The Reports tab shows late trends over the last 30 days.';
  }
  if (t.includes('payroll') || t.includes('salary')) {
    return 'Set a salary structure per employee (basic, allowances, deductions, tax slabs) on the Payroll page, then Generate payroll for a month. Tax is computed progressively from the slabs; payslips can be saved as PDF from your browser.';
  }
  return "I'm the built-in workspace helper and can answer questions about employees, leave, attendance and payroll. For open-ended AI chat, deploy an `ai-assistant` edge function with an Anthropic API key (steps are in docs/SUPABASE.md).";
}

export default function AssistantPage() {
  const { user } = useAuth();
  const canAnomaly = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'].includes(user?.role);
  const [messages, setMessages] = useState([{ role: 'assistant', text: "Hi! I'm your HR assistant. Ask me anything about your workspace." }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: 'user', text: q }]); setInput(''); setBusy(true);
    try {
      const res = await assistant.ask(q, history);
      setMessages((m) => [...m, { role: 'assistant', text: res.answer }]);
    } catch {
      try { const a = await localAnswer(q); setMessages((m) => [...m, { role: 'assistant', text: a }]); }
      catch { setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, I could not respond right now.' }]); }
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="AI Assistant" subtitle="Chat with your HR copilot and surface attendance anomalies" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card flex h-[560px] flex-col lg:col-span-2">
          <div className="flex items-center gap-2 border-b px-5 py-3"><div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><Bot size={16} /></div><span className="font-semibold">HR Copilot</span></div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{m.text}</div>
              </div>
            ))}
            {busy && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400 dark:bg-slate-800">Thinking…</div></div>}
            <div ref={endRef} />
          </div>
          <div className="border-t p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => <button key={s} className="badge bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300" onClick={() => send(s)}>{s}</button>)}
            </div>
            <div className="flex gap-2">
              <input className="input" placeholder="Ask the assistant…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
              <button className="btn-primary" disabled={busy} onClick={() => send()}><Send size={16} /></button>
            </div>
            <p className="mt-2 text-center text-xs text-slate-400">Powered by the <code>ai-assistant</code> edge function. Set <code>ANTHROPIC_API_KEY</code> on the project for full LLM answers (built-in helper otherwise).</p>
          </div>
        </div>

        {canAnomaly && <AnomalyPanel />}
      </div>
    </>
  );
}

function AnomalyPanel() {
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { empApi.list({ limit: 100 }).then((r) => setEmployees(r.items)).catch(() => {}); }, []);

  // z-score anomaly detection over recent worked-minutes — fully client-side.
  const run = async () => {
    if (!employeeId) return;
    setBusy(true); setResult(null);
    try {
      const { data } = await supabase.from('attendance')
        .select('work_date,worked_minutes,is_late')
        .eq('employee_id', employeeId).order('work_date', { ascending: false }).limit(60);
      const rows = (data || []).filter((r) => r.worked_minutes != null);
      if (rows.length < 4) { setResult({ anomalies: [] }); return; }
      const vals = rows.map((r) => r.worked_minutes);
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length) || 1;
      const anomalies = rows
        .map((r) => ({ date: r.work_date, anomalyScore: (r.worked_minutes - mean) / sd, worked: r.worked_minutes }))
        .filter((a) => Math.abs(a.anomalyScore) > 2)
        .map((a) => ({ ...a, anomalyReason: a.anomalyScore < 0 ? 'Unusually short workday' : 'Unusually long workday' }));
      setResult({ anomalies });
    } catch (e) { setResult({ error: e.message || 'Failed' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-2"><Activity size={18} className="text-brand-600" /><span className="font-semibold">Attendance anomalies</span></div>
      <p className="mb-3 text-xs text-slate-400">Statistical (z-score) detection over recent work hours — runs fully offline.</p>
      <select className="input mb-2" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
        <option value="">— select employee —</option>
        {employees.map((e) => <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>)}
      </select>
      <button className="btn-primary w-full" disabled={busy || !employeeId} onClick={run}><Sparkles size={15} /> {busy ? 'Analyzing…' : 'Detect anomalies'}</button>

      {result && (
        <div className="mt-4 text-sm">
          {result.error ? <div className="text-rose-600">{result.error}</div>
            : result.anomalies?.length ? (
              <div className="space-y-2">
                <div className="font-medium text-amber-600">{result.anomalies.length} anomalies flagged</div>
                {result.anomalies.map((a, i) => (
                  <div key={i} className="rounded-xl bg-amber-50 px-3 py-2 text-xs dark:bg-amber-950/30">
                    <div className="font-medium">{a.date}</div><div className="text-slate-500">{a.anomalyReason} (score {a.anomalyScore?.toFixed?.(2)})</div>
                  </div>
                ))}
              </div>
            ) : <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/30">No anomalies detected.</div>}
        </div>
      )}
    </div>
  );
}
