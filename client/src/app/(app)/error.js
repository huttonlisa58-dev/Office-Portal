'use client';
import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

// Catches runtime/render errors anywhere in the authenticated app segment
// so a single widget crash shows a friendly retry screen instead of a blank page.
export default function AppError({ error, reset }) {
  useEffect(() => { if (typeof console !== 'undefined') console.error('App segment error:', error); }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40">
          <AlertTriangle size={26} />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Something went wrong</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          This section hit an unexpected error. Your data is safe — try again, and if it keeps happening, let us know.
        </p>
        <button onClick={() => reset()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">
          <RotateCw size={15} /> Try again
        </button>
      </div>
    </div>
  );
}
