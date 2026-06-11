export default function PageBanner({ icon: Icon, title, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-5 text-white shadow-soft">
      <div className="flex items-center gap-3">{Icon && <Icon size={24} />}<h1 className="text-xl font-bold sm:text-2xl">{title}</h1></div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
