export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="grid place-items-center py-16 text-sm text-slate-400">
      <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label}
    </div>
  );
}
