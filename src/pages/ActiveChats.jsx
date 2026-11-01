import { useState } from 'react';
import { useAppStore } from '../store';
import Header from '../components/ui/Header';
import OrderChatModal from '../components/modals/OrderChatModal';

export default function ActiveChats() {
  const { currentUser, orders, users, services, setSelectedWorkerId, setSelectedClientId } = useAppStore();
  const [activeChat, setActiveChat] = useState(null);

  if (!currentUser) return null;

  const role = currentUser.role;
  const myOrders = orders.filter(o => role === 'CONTRATANTE' ? o.contratante_id === currentUser.id : o.worker_id === currentUser.id);
  const ativos = myOrders.filter(o => ['PENDENTE','ACEITO','EM_ANDAMENTO'].includes(o.status));

  return (
    <div className="pb-24 animate-fade-in w-full">
      <Header
        title="Atendimentos em Andamento"
        subtitle="Converse em tempo real, aprove orçamentos e acompanhe suas solicitações ativas"
      />
      <div className="px-4 md:px-8 max-w-7xl mx-auto">
        {ativos.length === 0 ? (
          <div className="text-center bg-white p-12 rounded-2xl border border-slate-200/80 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <i className="ph-fill ph-chats text-2xl" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Nenhuma conversa ativa</h3>
            <p className="text-xs mt-1 text-slate-500">Solicitações pendentes ou em execução aparecerão aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ativos.map(o => {
              const otherId = role === 'CONTRATANTE' ? o.worker_id : o.contratante_id;
              const otherUser = users.find(u => u.id === otherId);
              const servico = services.find(s => s.id === o.servico_id);
              const lastMsg = o.chat_history?.[o.chat_history.length - 1];
              const isPending = o.status === 'PENDENTE';

              return (
                <div key={o.id} className="card-pro rounded-2xl p-5 flex flex-col justify-between hover:border-slate-300 transition">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
                        isPending
                          ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                          : 'bg-sky-50 text-sky-700 border-sky-200/80'
                      }`}>
                        {isPending ? 'Aguardando Confirmação' : 'Em Andamento'}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {o.preco_final > 0 ? `R$ ${o.preco_final}` : 'A combinar'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base truncate">
                      {servico?.titulo || 'Serviço Personalizado'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                      <i className="ph-bold ph-calendar-blank text-slate-400" />
                      <span>{o.agendamento || 'Data a combinar'}</span>
                    </p>

                    <div
                      className="flex gap-3 items-center mt-4 pt-3.5 border-t border-slate-100 cursor-pointer group"
                      onClick={() => role === 'CONTRATANTE' ? setSelectedWorkerId(otherId) : setSelectedClientId(otherId)}
                    >
                      <img
                        src={otherUser?.foto_perfil_url}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                        alt={otherUser?.nome}
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">
                          {role === 'CONTRATANTE' ? 'Profissional' : 'Cliente'}
                        </p>
                        <h4 className="font-bold text-slate-800 text-xs group-hover:text-[#EA1D2C] transition truncate">
                          {otherUser?.nome}
                        </h4>
                      </div>
                    </div>

                    {lastMsg && (
                      <div className="mt-3 bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs text-slate-600 truncate">
                        <span className="font-semibold text-slate-400 mr-1">{lastMsg.time}:</span>
                        {lastMsg.text}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveChat(o)}
                    className="mt-4 w-full bg-[#EA1D2C] text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#C81422] transition shadow-xs cursor-pointer"
                  >
                    <i className="ph-fill ph-chat-circle-dots text-base" /> Abrir Conversa
                  </button>
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
