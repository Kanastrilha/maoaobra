// src/components/ui/Toast.jsx
import { useAppStore } from '../../store';

const config = {
  success: { icon: 'ph-check-circle', iconCls: 'text-emerald-400', border: 'border-emerald-500/30' },
  error:   { icon: 'ph-x-circle',     iconCls: 'text-red-400',     border: 'border-red-500/30' },
  warning: { icon: 'ph-warning',      iconCls: 'text-amber-400',   border: 'border-amber-500/30' },
  info:    { icon: 'ph-info',         iconCls: 'text-sky-400',     border: 'border-sky-500/30' },
};

export default function Toast() {
  const toast = useAppStore(s => s.toast);
  if (!toast) return null;

  const style = config[toast.type] || config.success;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[999999] animate-slide-down pointer-events-none px-4 w-full max-w-md flex justify-center">
      <div className={`bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl border ${style.border} flex items-center gap-3 font-semibold text-xs sm:text-sm`}>
        <i className={`ph-fill ${style.icon} ${style.iconCls} text-xl shrink-0`} />
        <span className="leading-snug">{toast.message}</span>
      </div>
    </div>
  );
}
