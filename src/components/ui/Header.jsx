// src/components/ui/Header.jsx
export default function Header({ title, subtitle, showBack, onBack, rightContent }) {
  return (
    <div className="bg-white border-b border-slate-200/80 mb-6">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {showBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-[#EA1D2C] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            >
              <i className="ph-bold ph-arrow-left text-base" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="font-extrabold text-xl md:text-2xl text-slate-900 tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {rightContent && <div className="shrink-0">{rightContent}</div>}
      </div>
    </div>
  );
}
