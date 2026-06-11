import PageBanner from '@/components/PageBanner';
import { Hammer } from 'lucide-react';
export default function ComingSoon({ icon, title, note }) {
  return (
    <>
      <PageBanner icon={icon} title={title} />
      <div className="card flex flex-col items-center gap-3 p-12 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-sky-50 text-sky-500 dark:bg-sky-950/40"><Hammer size={26} /></div>
        <div className="text-lg font-semibold">{title} module is on the way</div>
        <p className="max-w-md text-sm text-slate-500">{note || 'This screen mirrors OfficePortal and will be wired to live data in the next build. The navigation and layout are already in place.'}</p>
      </div>
    </>
  );
}
