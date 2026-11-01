// src/pages/WorkerDashboard.jsx
import { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import OrderChatModal from '../components/modals/OrderChatModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function WorkerDashboard() {
  const { orders, users, services, currentUser, setSelectedClientId } = useAppStore();
  const [activeChat, setActiveChat] = useState(null);

  const myOrders = orders.filter(o => o.worker_id === currentUser.id);
  const ativos = myOrders.filter(o => ['PENDENTE','EM_ANDAMENTO'].includes(o.status));
  const concluidos = myOrders.filter(o => o.status === 'CONCLUIDO');
  const receitaTotal = concluidos.reduce((acc, o) => acc + (Number(o.preco_final) || 0), 0);

  const chartData = useMemo(() => {
    if (concluidos.length === 0) {
      return [
        { name: 'Semana 1', ganhos: 0 },
        { name: 'Semana 2', ganhos: 0 },
        { name: 'Semana 3', ganhos: 0 },
        { name: 'Semana Atual', ganhos: 0 },
      ];
    }
    return [
      { name: 'Semana 1', ganhos: 0 },
      { name: 'Semana 2', ganhos: 0 },
      { name: 'Semana 3', ganhos: 0 },
      { name: 'Semana Atual', ganhos: receitaTotal },
    ];
  }, [concluidos, receitaTotal]);

  return (
    <div className="pb-24 animate-fade-in w-full">
      {/* Executive Header */}
      <div className="bg-slate-900 pt-8 pb-8 px-4 md:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <img
              src={currentUser.foto_perfil_url}
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border-2 border-white/15 bg-slate-800 object-cover"
              alt={currentUser.nome}
            />
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-400">
                <i className="ph-fill ph-briefcase" /> Central do Profissional
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-0.5">
                Olá, {currentUser.nome.split(' ')[0]}
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            {[
              { label: 'Em Aberto', value: ativos.length, color: 'text-amber-400', icon: 'ph-clock-countdown' },
              { label: 'Concluídos', value: concluidos.length, color: 'text-emerald-400', icon: 'ph-check-circle' },
              { label: 'Total Pedidos', value: myOrders.length, color: 'text-white', icon: 'ph-receipt' },
              { label: 'Faturamento', value: `R$ ${receitaTotal}`, color: 'text-emerald-400', icon: 'ph-currency-dollar' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 backdrop-blur-xs rounded-xl px-4 py-3 border border-white/10 min-w-[120px]">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <span>{s.label}</span>
                  <i className={`ph-fill ${s.icon} text-xs`} />
                </div>
                <div className={`text-xl font-extrabold ${s.color} mt-1`}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Active Requests */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                Solicitações e Serviços Ativos
              </h2>
              <p className="text-xs text-slate-500 font-medium">Acompanhe novos pedidos e negocie com clientes</p>
            </div>
            <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-lg border border-amber-200/80">
              {ativos.length} {ativos.length === 1 ? 'ativo' : 'ativos'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ativos.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200/80 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <i className="ph-fill ph-coffee text-2xl" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Nenhuma solicitação pendente</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Novos chamados de clientes aparecerão aqui em tempo real.</p>
              </div>
            ) : ativos.map(o => {
              const client = users.find(u => u.id === o.contratante_id);
              const srv = services.find(s => s.id === o.servico_id);
              const isPending = o.status === 'PENDENTE';
              return (
                <div key={o.id} className="card-pro rounded-2xl p-5 flex flex-col justify-between hover:border-slate-300 transition">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                        isPending
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {isPending ? 'Novo Pedido' : 'Em Execução'}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm bg-slate-100 px-2.5 py-1 rounded-lg">
                        {o.preco_final > 0 ? `R$ ${o.preco_final}` : 'A orçar'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base truncate">{srv?.titulo || 'Serviço Personalizado'}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                      <i className="ph-bold ph-calendar-blank text-[#EA1D2C]" />
                      <span>{o.agendamento || 'Data a combinar'}</span>
                    </div>

                    <div
                      className="bg-slate-50 p-3 rounded-xl flex items-center gap-3 my-4 border border-slate-100 cursor-pointer hover:border-slate-300 transition group"
                      onClick={() => setSelectedClientId(client?.id)}
                    >
                      <img src={client?.foto_perfil_url} className="w-9 h-9 rounded-lg border border-slate-200 object-cover" alt={client?.nome} />
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Solicitante</span>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-[#EA1D2C] transition truncate">{client?.nome}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveChat(o)}
                    className="bg-[#EA1D2C] hover:bg-[#C81422] transition text-white py-2.5 rounded-xl w-full font-semibold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="ph-fill ph-chat-circle-dots text-base" /> Gerenciar Pedido & Chat
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Financial Chart */}
        <section className="card-pro rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base md:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <i className="ph-fill ph-chart-bar text-emerald-500" /> Desempenho Financeiro
              </h2>
              <p className="text-xs text-slate-500">Receita bruta apurada nos serviços concluídos</p>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-lg border border-emerald-200/80">
              Mês Atual
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => `R$${val}`} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)', fontWeight: 600, fontSize: '12px' }}
                  formatter={(value) => [`R$ ${value}`, 'Faturamento']}
                />
                <Bar dataKey="ganhos" fill="#EA1D2C" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      {activeChat && <OrderChatModal order={orders.find(o => o.id === activeChat.id)} onClose={() => setActiveChat(null)} />}
    </div>
  );
}
