import { useState, useEffect } from 'react';
import { useAppStore } from '../../store';

const CONTRATANTE_LINKS = [
  { id: 'HOME',    icon: 'ph-compass',          label: 'Explorar' },
  { id: 'CHATS',   icon: 'ph-chat-circle-dots', label: 'Mensagens' },
  { id: 'ORDERS',  icon: 'ph-receipt',          label: 'Pedidos' },
  { id: 'PROFILE', icon: 'ph-user-circle',      label: 'Minha Conta' },
];
const WORKER_LINKS = [
  { id: 'WORKER_DASH',     icon: 'ph-squares-four',     label: 'Visão Geral' },
  { id: 'CHATS',           icon: 'ph-chat-circle-dots', label: 'Atendimentos' },
  { id: 'WORKER_SERVICES', icon: 'ph-briefcase',        label: 'Catálogo' },
  { id: 'WORKER_HISTORY',  icon: 'ph-clock-counter-clockwise', label: 'Histórico' },
  { id: 'WORKER_PROFILE',  icon: 'ph-sliders-horizontal', label: 'Perfil' },
];
const ADMIN_LINKS = [
  { id: 'ADMIN_DASH',      icon: 'ph-gauge',       label: 'Painel' },
  { id: 'ADMIN_CLIENTS',   icon: 'ph-users',       label: 'Clientes' },
  { id: 'ADMIN_WORKERS',   icon: 'ph-hard-hat',    label: 'Profissionais' },
  { id: 'ADMIN_APPROVALS', icon: 'ph-seal-check',  label: 'Aprovações' },
  { id: 'ADMIN_SUPPORT',   icon: 'ph-headset',     label: 'Suporte' },
  { id: 'ADMIN_CHATS',     icon: 'ph-chats',       label: 'Auditoria' },
];

const ROLE_LABELS = {
  ADMIN: { text: 'Admin', cls: 'bg-slate-900 text-white' },
  TRABALHADOR: { text: 'Parceiro Pro', cls: 'bg-red-50 text-[#EA1D2C] border border-red-200/60' },
  CONTRATANTE: { text: 'Cliente', cls: 'bg-slate-100 text-slate-600' },
};

export default function NavBar() {
  const { currentUser, currentView, setCurrentView, logout, orders, users, supportTickets } = useAppStore();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [deferredPrompt, setDeferredPrompt] = useState(window.deferredPwaPrompt || null);

  useEffect(() => {
    const handler = () => setDeferredPrompt(window.deferredPwaPrompt);
    if (window.deferredPwaPrompt) setDeferredPrompt(window.deferredPwaPrompt);
    window.addEventListener('pwa-ready', handler);
    return () => window.removeEventListener('pwa-ready', handler);
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const role = currentUser?.role;
  const links = !currentUser ? [] : role === 'ADMIN' ? ADMIN_LINKS : role === 'TRABALHADOR' ? WORKER_LINKS : CONTRATANTE_LINKS;

  const myOrders = !currentUser ? [] : orders.filter(o =>
    role === 'CONTRATANTE' ? o.contratante_id === currentUser.id : o.worker_id === currentUser.id
  );
  const hasUnread = myOrders.some(o => o.chat_history?.length > 0 && ['PENDENTE','ACEITO','EM_ANDAMENTO'].includes(o.status));
  const pendingApprovalsCount = role === 'ADMIN' ? users.filter(u => u.role === 'TRABALHADOR' && u.status === 'PENDING').length : 0;
  const openTicketsCount = role === 'ADMIN' ? supportTickets.filter(t => t.status === 'OPEN').length : 0;

  const Logo = () => (
    <button
      onClick={() => setCurrentView(role === 'ADMIN' ? 'ADMIN_DASH' : role === 'TRABALHADOR' ? 'WORKER_DASH' : 'HOME')}
      className="flex items-center gap-2.5 select-none cursor-pointer group text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#EA1D2C] to-[#C81422] flex items-center justify-center text-white shadow-sm shadow-red-500/25 group-hover:scale-105 transition-transform">
        <i className="ph-bold ph-wrench text-lg" />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-xl tracking-tight text-slate-900">
          mão<span className="text-[#EA1D2C]">A</span>obra
        </span>
        {role && (
          <span className={`hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${ROLE_LABELS[role]?.cls}`}>
            {ROLE_LABELS[role]?.text}
          </span>
        )}
      </div>
    </button>
  );

  if (!currentUser) {
    return (
      <header className="fixed top-0 w-full glass-header border-b border-slate-200/80 z-50 h-18 px-4 md:px-8">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsDark(!isDark)}
              title="Alternar tema"
              className="w-9 h-9 rounded-xl bg-slate-100/80 flex items-center justify-center text-slate-600 hover:text-[#EA1D2C] hover:bg-red-50 transition border border-slate-200/60"
            >
              <i className={`ph-fill ${isDark ? 'ph-moon' : 'ph-sun'} text-base`} />
            </button>
            {deferredPrompt && (
              <button
                onClick={async () => {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === 'accepted') setDeferredPrompt(null);
                }}
                className="flex items-center gap-1.5 bg-emerald-600 text-white font-semibold px-3.5 py-2 rounded-xl hover:bg-emerald-700 shadow-xs transition text-xs"
              >
                <i className="ph-bold ph-download-simple" />
                <span className="hidden md:inline">Instalar App</span>
              </button>
            )}
            <button
              onClick={() => setCurrentView('REGISTER')}
              className="hidden sm:inline-flex items-center gap-1.5 font-semibold text-sm text-slate-700 hover:text-[#EA1D2C] px-3.5 py-2 rounded-xl hover:bg-slate-100/70 transition"
            >
              Cadastrar-se
            </button>
            <button
              onClick={() => setCurrentView('LOGIN')}
              className="bg-[#EA1D2C] text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#C81422] shadow-sm shadow-red-500/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <i className="ph-bold ph-sign-in text-base" />
              <span>Entrar</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* ── Mobile Top Bar (Logged in) ── */}
      <header className="md:hidden fixed top-0 w-full glass-header border-b border-slate-200/80 z-50 h-16 px-4 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDark(!isDark)}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:text-[#EA1D2C] transition"
          >
            <i className={`ph-fill ${isDark ? 'ph-moon' : 'ph-sun'} text-base`} />
          </button>
          <button
            onClick={() => setCurrentView(role === 'TRABALHADOR' ? 'WORKER_PROFILE' : role === 'CONTRATANTE' ? 'PROFILE' : 'ADMIN_DASH')}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/70"
          >
            <img src={currentUser.foto_perfil_url} alt={currentUser.nome} className="w-7 h-7 rounded-full object-cover" />
            <span className="text-xs font-semibold text-slate-700 max-w-[80px] truncate">{currentUser.nome.split(' ')[0]}</span>
          </button>
        </div>
      </header>

      {/* ── Desktop Header ── */}
      <header className="hidden md:block fixed top-0 w-full glass-header border-b border-slate-200/80 z-50 h-18 px-8">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <Logo />

          <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
            {links.map(link => {
              const active = currentView === link.id;
              const badge = (link.id === 'CHATS' && hasUnread) ||
                            (link.id === 'ADMIN_APPROVALS' && pendingApprovalsCount > 0) ||
                            (link.id === 'ADMIN_SUPPORT' && openTicketsCount > 0);
              return (
                <button
                  key={link.id}
                  onClick={() => setCurrentView(link.id)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer
                    ${active
                      ? 'bg-white text-[#EA1D2C] shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}`}
                >
                  <i className={`${active ? 'ph-fill' : 'ph-bold'} ${link.icon} text-base`} />
                  <span>{link.label}</span>
                  {badge && (
                    <span className="w-2 h-2 bg-[#EA1D2C] rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsDark(!isDark)}
              title="Alternar tema"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition border border-transparent hover:border-slate-200/60 cursor-pointer"
            >
              <i className={`ph-fill ${isDark ? 'ph-moon' : 'ph-sun'} text-base`} />
            </button>

            <div className="h-5 w-px bg-slate-200" />

            <div
              onClick={() => {
                if (role === 'CONTRATANTE') setCurrentView('PROFILE');
                else if (role === 'TRABALHADOR') setCurrentView('WORKER_PROFILE');
              }}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-xl hover:bg-slate-100/80 transition cursor-pointer"
            >
              <img src={currentUser.foto_perfil_url} alt={currentUser.nome} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
              <div className="text-left leading-tight">
                <div className="text-xs font-bold text-slate-800 max-w-[110px] truncate">{currentUser.nome.split(' ')[0]}</div>
                <div className="text-[10px] font-medium text-slate-400">{ROLE_LABELS[role]?.text}</div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sair da conta"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-[#EA1D2C] transition cursor-pointer"
            >
              <i className="ph-bold ph-sign-out text-base" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Bar ── */}
      <nav className="md:hidden fixed bottom-0 w-full glass-header border-t border-slate-200/80 flex justify-around items-center py-2 px-2 z-50 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        {links.map(link => {
          const active = currentView === link.id;
          const badge = (link.id === 'CHATS' && hasUnread) ||
                        (link.id === 'ADMIN_APPROVALS' && pendingApprovalsCount > 0) ||
                        (link.id === 'ADMIN_SUPPORT' && openTicketsCount > 0);
          return (
            <button
              key={link.id}
              onClick={() => setCurrentView(link.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                active ? 'text-[#EA1D2C]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`relative flex items-center justify-center w-9 h-7 rounded-lg transition-colors ${active ? 'bg-red-50' : ''}`}>
                <i className={`text-lg ${active ? 'ph-fill' : 'ph-bold'} ${link.icon}`} />
                {badge && (
                  <span className="absolute top-0.5 right-1.5 w-2 h-2 bg-[#EA1D2C] rounded-full ring-2 ring-white animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] mt-0.5 ${active ? 'font-bold' : 'font-medium'}`}>{link.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
