// src/pages/AdminDashboard.jsx
import { useAppStore } from '../store';

export default function AdminDashboard() {
  const { users, orders, supportTickets, logout, setCurrentView } = useAppStore();
  const totalClients   = users.filter(u => u.role === 'CONTRATANTE').length;
  const totalWorkers   = users.filter(u => u.role === 'TRABALHADOR' && u.status === 'APPROVED').length;
  const pendingWorkers = users.filter(u => u.role === 'TRABALHADOR' && u.status === 'PENDING').length;
  const doneOrders     = orders.filter(o => o.status === 'CONCLUIDO').length;
  const openTickets    = supportTickets.filter(t => t.status === 'OPEN').length;

  return (
    <div className="pb-24 animate-fade-in w-full">
      <div className="bg-slate-900 pt-8 pb-8 px-4 md:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-400">
              <i className="ph-fill ph-shield-check" /> Administração da Plataforma
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-0.5">
              Visão Geral Operacional
            </h1>
          </div>
          <button
            onClick={logout}
            className="bg-white/10 hover:bg-white/15 text-white text-xs font-semibold py-2.5 px-4 rounded-xl border border-white/10 flex items-center gap-2 transition cursor-pointer"
          >
            <i className="ph-bold ph-sign-out" /> Encerrar Sessão
          </button>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: 'ph-users', color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100', val: totalClients, label: 'Clientes Ativos', view: 'ADMIN_CLIENTS' },
            { icon: 'ph-hard-hat', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', val: totalWorkers, label: 'Profissionais Aprovados', view: 'ADMIN_WORKERS' },
            { icon: 'ph-seal-check', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', val: pendingWorkers, label: 'Aprovações Pendentes', view: 'ADMIN_APPROVALS', highlight: pendingWorkers > 0 },
            { icon: 'ph-check-circle', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100', val: doneOrders, label: 'Serviços Concluídos' },
          ].map(s => (
            <div
              key={s.label}
              onClick={() => s.view && setCurrentView(s.view)}
              className={`card-pro p-5 rounded-2xl flex flex-col justify-between ${
                s.view ? 'cursor-pointer hover:border-slate-300 hover:shadow-md' : ''
              } transition`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${s.bg} border rounded-xl flex items-center justify-center`}>
                  <i className={`ph-fill ${s.icon} ${s.color} text-xl`} />
                </div>
                {s.view && <i className="ph-bold ph-arrow-up-right text-slate-400 text-sm" />}
              </div>
              <div>
                <div className={`text-2xl md:text-3xl font-extrabold ${s.highlight ? 'text-amber-600' : 'text-slate-900'}`}>
                  {s.val}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Management Modules */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-3">Módulos de Governança e Suporte</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                view: 'ADMIN_APPROVALS',
                icon: 'ph-seal-check text-amber-600',
                bg: 'bg-amber-50',
                label: 'Curadoria de Profissionais',
                desc: `${pendingWorkers} cadastro(s) aguardando revisão`,
              },
              {
                view: 'ADMIN_SUPPORT',
                icon: 'ph-headset text-[#EA1D2C]',
                bg: 'bg-red-50',
                label: 'Central de Suporte',
                desc: `${openTickets} chamado(s) em aberto`,
              },
              {
                view: 'ADMIN_CHATS',
                icon: 'ph-chats text-sky-600',
                bg: 'bg-sky-50',
                label: 'Auditoria de Conversas',
                desc: 'Monitoramento de negociações ativas',
              },
            ].map(item => (
              <div
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className="card-pro p-5 rounded-2xl hover:border-slate-300 hover:shadow-md transition cursor-pointer flex items-center gap-4 group"
              >
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  <i className={`ph-fill ${item.icon} text-2xl`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#EA1D2C] transition">{item.label}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{item.desc}</p>
                </div>
                <i className="ph-bold ph-caret-right text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
