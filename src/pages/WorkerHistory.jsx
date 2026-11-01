// src/pages/WorkerHistory.jsx
import { useState } from 'react';
import { useAppStore } from '../store';
import Header from '../components/ui/Header';
import OrderChatModal from '../components/modals/OrderChatModal';

export default function WorkerHistory() {
  const { orders, users, services, currentUser, setSelectedClientId } = useAppStore();
  const [activeChat, setActiveChat] = useState(null);
  const myOrders = orders.filter(o => o.worker_id === currentUser.id && ['CONCLUIDO','CANCELADO','RECUSADO'].includes(o.status));

  return (
    <div className="pb-24 animate-fade-in w-full">
      <Header
        title="Histórico de Atendimentos"
        subtitle="Registro completo de serviços concluídos, recusados ou cancelados"
      />
      <div className="px-4 md:px-8 max-w-7xl mx-auto">
        {myOrders.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-2xl border border-slate-200/80 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <i className="ph-fill ph-clock-counter-clockwise text-2xl" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Sem histórico registrado</h3>
            <p className="text-xs text-slate-500">Seus atendimentos finalizados serão listados aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myOrders.map(o => {
              const client = users.find(u => u.id === o.contratante_id);
              const servico = services.find(s => s.id === o.servico_id);
              const done = o.status === 'CONCLUIDO';
              return (
                <div key={o.id} className="card-pro rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                        done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {done ? 'Concluído' : o.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{o.data}</span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 mb-4">
                      <h3 className="font-bold text-slate-900 text-base truncate">{servico?.titulo || 'Serviço Personalizado'}</h3>
                      <span className="font-extrabold text-slate-900 text-base shrink-0">R$ {o.preco_final}</span>
                    </div>

                    <div
                      onClick={() => setSelectedClientId(client?.id)}
                      className="bg-slate-50 p-3 rounded-xl flex items-center gap-3 border border-slate-100 cursor-pointer hover:border-slate-300 transition mb-4"
                    >
                      <img src={client?.foto_perfil_url} className="w-9 h-9 rounded-lg border border-slate-200 object-cover" alt={client?.nome} />
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block">Cliente</span>
                        <div className="text-xs font-bold text-slate-800 truncate">{client?.nome}</div>
                      </div>
                    </div>
                  </div>

                  {o.chat_history?.length > 0 && (
                    <button
                      onClick={() => setActiveChat(o)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <i className="ph-bold ph-chat-circle-dots text-sm" /> Ver Registro do Chat
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
