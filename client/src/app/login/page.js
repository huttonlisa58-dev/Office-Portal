'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Mail, Smartphone, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabaseClient';

function BracketLogo({ size = 60 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <path d="M12 34 V12 H34" stroke="#f4b400" strokeWidth="11" fill="none" strokeLinecap="square" />
      <path d="M66 12 H88 V34" stroke="#db4437" strokeWidth="11" fill="none" strokeLinecap="square" />
      <path d="M12 66 V88 H34" stroke="#4285f4" strokeWidth="11" fill="none" strokeLinecap="square" />
      <path d="M66 88 H88 V66" stroke="#0f9d58" strokeWidth="11" fill="none" strokeLinecap="square" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState('choose'); // choose | password | otp | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const needEmail = () => { if (!email.trim()) { setErr('Enter your email first.'); return true; } setErr(''); return false; };

  const usePassword = () => { if (needEmail()) return; setMsg(''); setErr(''); setStep('password'); };

  const doPassword = async () => {
    setBusy(true); setErr(''); setMsg('');
    try { await login(email.trim(), password); router.replace('/dashboard'); }
    catch (e) { setErr(e.message || 'Invalid email or password.'); }
    finally { setBusy(false); }
  };

  const sendOtp = async () => {
    if (needEmail()) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
      if (error) throw error;
      setStep('otp'); setMsg('We emailed you a 6-digit code. Enter it below.');
    } catch (e) { setErr(e.message || 'Could not send the code. Email sign-in may not be configured.'); }
    finally { setBusy(false); }
  };

  const verifyOtp = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error) throw error;
      router.replace('/dashboard');
    } catch (e) { setErr(e.message || 'Invalid or expired code.'); }
    finally { setBusy(false); }
  };

  const doForgot = async () => {
    if (needEmail()) return;
    setBusy(true); setErr(''); setMsg('');
    try { await supabase.auth.resetPasswordForEmail(email.trim()); setMsg('If the account exists, a reset email was sent.'); }
    catch (e) { setErr(e.message || 'Could not send reset email.'); }
    finally { setBusy(false); }
  };

  const Btn = ({ icon: Icon, label, onClick, disabled, primary }) => (
    <button onClick={onClick} disabled={disabled || busy}
      className={`flex w-full items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-semibold uppercase tracking-wide transition disabled:opacity-50 ${primary ? 'border-sky-500 bg-sky-500 text-white hover:bg-sky-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      {/* Left hero */}
      <div className="relative hidden flex-col justify-center overflow-hidden bg-slate-900 p-14 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-900 to-black" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(600px circle at 80% 10%, rgba(255,255,255,0.18), transparent 40%)' }} />
        <div className="relative">
          <BracketLogo size={68} />
          <h1 className="mt-10 text-5xl font-light tracking-tight">Welcome to HRMS</h1>
          <p className="mt-4 text-lg text-slate-300">The place where you do more work but collaboratively!</p>
        </div>
      </div>

      {/* Right login */}
      <div className="flex items-center justify-center bg-white p-6 dark:bg-slate-950">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between lg:justify-end">
            <div className="flex items-center gap-2 lg:hidden"><BracketLogo size={32} /><span className="font-semibold">HRMS</span></div>
            <button onClick={toggle} className="text-sm text-slate-400 hover:text-slate-600">{theme === 'dark' ? 'Light' : 'Dark'} mode</button>
          </div>

          <h2 className="text-center text-xl font-medium tracking-wide text-slate-700 dark:text-slate-200">LOGIN TO YOUR ACCOUNT</h2>

          {err && <div className="mt-5 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{err}</div>}
          {msg && <div className="mt-5 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{msg}</div>}

          <div className="mt-6 space-y-4">
            <div className="relative">
              <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-sky-600 dark:bg-slate-950">Email</label>
              <input className="w-full rounded-md border border-sky-400 bg-transparent px-3 py-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={step === 'otp'} />
            </div>

            {step === 'choose' && (
              <>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-sky-500" />
                  Remember me for 365 days
                </label>
                <div className="space-y-3 pt-1">
                  <Btn icon={KeyRound} label="Use password" onClick={usePassword} />
                  <Btn icon={Mail} label="Send OTP to email" onClick={sendOtp} />
                  <Btn icon={Smartphone} label="Approve on mobile app" disabled title="Mobile app not available yet" />
                </div>
                <p className="text-center text-xs text-slate-400">Mobile approval coming soon.</p>
              </>
            )}

            {step === 'password' && (
              <>
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-sky-600 dark:bg-slate-950">Password</label>
                  <input className="w-full rounded-md border border-sky-400 bg-transparent px-3 py-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900"
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                    onKeyDown={(e) => e.key === 'Enter' && doPassword()} autoFocus />
                </div>
                <Btn icon={busy ? Loader2 : KeyRound} label={busy ? 'Signing in…' : 'Sign in'} onClick={doPassword} primary />
                <div className="flex justify-between text-xs">
                  <button onClick={() => { setStep('choose'); setErr(''); }} className="inline-flex items-center gap-1 text-slate-500 hover:text-sky-600"><ArrowLeft size={13} /> Back</button>
                  <button onClick={() => { setStep('forgot'); setErr(''); }} className="text-sky-600 hover:underline">Forgot password?</button>
                </div>
              </>
            )}

            {step === 'otp' && (
              <>
                <div className="relative">
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-sky-600 dark:bg-slate-950">6-digit code</label>
                  <input className="w-full rounded-md border border-sky-400 bg-transparent px-3 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-sky-500"
                    inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && verifyOtp()} autoFocus />
                </div>
                <Btn icon={busy ? Loader2 : Mail} label={busy ? 'Verifying…' : 'Verify & sign in'} onClick={verifyOtp} primary />
                <div className="flex justify-between text-xs">
                  <button onClick={() => { setStep('choose'); setCode(''); setErr(''); setMsg(''); }} className="inline-flex items-center gap-1 text-slate-500 hover:text-sky-600"><ArrowLeft size={13} /> Back</button>
                  <button onClick={sendOtp} className="text-sky-600 hover:underline">Resend code</button>
                </div>
              </>
            )}

            {step === 'forgot' && (
              <>
                <p className="text-sm text-slate-500">We&apos;ll email you a password reset link.</p>
                <Btn icon={busy ? Loader2 : Mail} label={busy ? 'Sending…' : 'Send reset link'} onClick={doForgot} primary />
                <button onClick={() => { setStep('choose'); setErr(''); setMsg(''); }} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-sky-600"><ArrowLeft size={13} /> Back</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
