// src/pages/ClientOrders.jsx
import { useState } from 'react';
import { useAppStore } from '../store';
import Header from '../components/ui/Header';
import OrderChatModal from '../components/modals/OrderChatModal';

export default function ClientOrders() {
  const { currentUser, orders, users, services, setCurrentView, setSelectedWorkerId } = useAppStore();
  const [activeChat, setActiveChat] = useState(null);

  if (!currentUser) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <i className="ph-fill ph-receipt text-3xl" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Meus Pedidos</h2>
      <p className="text-xs text-slate-500 font-medium mb-5">Faça login para acompanhar seu histórico de contratações.</p>
      <button
        onClick={() => setCurrentView('LOGIN')}
        className="bg-[#EA1D2C] text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-xs hover:bg-[#C81422] transition cursor-pointer"
      >
        Fazer Login
      </button>
    </div>
  );

  const myOrders = orders.filter(o => o.contratante_id === currentUser.id && ['CONCLUIDO', 'RECUSADO', 'CANCELADO'].includes(o.status));

  const statusStyle = (status) => {
    if (status === 'CONCLUIDO') return { label: 'Concluído', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (status === 'RECUSADO') return { label: 'Recusado', badge: 'bg-red-50 text-red-700 border-red-200' };
    return { label: status, badge: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  return (
    <div className="pb-24 animate-fade-in w-full">
      <Header
        title="Histórico de Pedidos"
        subtitle="Consulte serviços concluídos e recibos de atendimentos anteriores"
      />
      <div className="px-4 md:px-8 max-w-7xl mx-auto">
        {myOrders.length === 0 ? (
          <div className="text-center bg-white p-12 rounded-2xl border border-slate-200/80 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <i className="ph-fill ph-receipt text-2xl" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Nenhum pedido finalizado</h3>
            <p className="text-xs mt-1 text-slate-500">Explore os profissionais disponíveis e solicite seu primeiro orçamento.</p>
            <button
              onClick={() => setCurrentView('HOME')}
              className="mt-5 bg-[#EA1D2C] text-white font-semibold text-xs px-5 py-2.5 rounded-xl hover:bg-[#C81422] transition cursor-pointer"
            >
              Explorar Profissionais
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myOrders.map(o => {
              const worker = users.find(u => u.id === o.worker_id);
              const servico = services.find(s => s.id === o.servico_id);
              const { label, badge } = statusStyle(o.status);
              return (
                <div key={o.id} className="card-pro rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3.5">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${badge}`}>{label}</span>
                      <span className="text-xs text-slate-400 font-medium">{o.data}</span>
                    </div>

                    <div
                      className="flex gap-3.5 items-center mb-4 cursor-pointer group"
                      onClick={() => setSelectedWorkerId(worker?.id)}
                    >
                      <img
                        src={worker?.foto_perfil_url}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                        alt={worker?.nome}
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{servico?.titulo || 'Serviço Personalizado'}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 group-hover:text-[#EA1D2C] transition truncate">
                          Profissional: {worker?.nome}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl flex justify-between items-center border border-slate-100 mb-4">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Agendamento</span>
                        <span className="text-xs font-bold text-slate-800">{o.agendamento || 'A combinar'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total</span>
                        <span className="font-extrabold text-slate-900 text-base">R$ {o.preco_final}</span>
                      </div>
                    </div>
                  </div>

                  {o.status !== 'RECUSADO' && (
                    <button
                      onClick={() => setActiveChat(o)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <i className="ph-bold ph-chat-circle-dots text-sm" /> Ver Histórico do Chat
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {activeChat && <OrderChatModal order={orders.find(o => o.id === activeChat.id)} onClose={() => setActiveChat(null)} />}
    </div>
  );
}
