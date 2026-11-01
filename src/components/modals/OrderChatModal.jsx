// src/components/modals/OrderChatModal.jsx
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store';
import ImageUploader from '../ui/ImageUploader';

const STATUS_BADGE = {
  PENDENTE:     { text: 'Aguardando Confirmação', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACEITO:       { text: 'Aceito',                 cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  EM_ANDAMENTO: { text: 'Em Execução',            cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  CONCLUIDO:    { text: 'Concluído',              cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RECUSADO:     { text: 'Recusado',               cls: 'bg-red-50 text-red-700 border-red-200' },
  CANCELADO:    { text: 'Cancelado',              cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function OrderChatModal({ order, onClose }) {
  const { users, currentUser, changeOrderStatus, sendMessage, services, showToast, setSelectedWorkerId, setSelectedClientId, submitReview } = useAppStore();
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [actionModal, setActionModal] = useState(null); // 'CANCEL' | 'FINISH'
  const [finishPrice, setFinishPrice] = useState('');
  const [clientRating, setClientRating] = useState(5);
  const [clientComment, setClientComment] = useState('');
  const chatRef = useRef(null);

  const client = users.find(u => u.id === order?.contratante_id);
  const worker = users.find(u => u.id === order?.worker_id);
  const srv = services.find(s => s.id === order?.servico_id);
  const otherUser = currentUser?.role === 'CONTRATANTE' ? worker : client;

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [order?.chat_history]);

  if (!order || !currentUser) return null;

  const updateOrderStatus = async (status) => {
    if (!await changeOrderStatus(order.id, status)) return;
    showToast(status === 'RECUSADO' ? 'Pedido recusado.' : status === 'EM_ANDAMENTO' ? 'Serviço aceito! Mãos à obra!' : 'Serviço finalizado!');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (showBudgetInput && budgetAmount) {
      const budgetVal = Number(budgetAmount);
      if (budgetVal > 0) {
        const newMsg = {
          sender: currentUser.id,
          text: `Proposta formal de orçamento enviada no valor de R$ ${budgetVal.toFixed(2)}.`,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          isBudget: true,
          amount: budgetVal
        };
        if (!await sendMessage(order.id, newMsg)) return;
        setShowBudgetInput(false);
        setBudgetAmount('');
        return;
      }
    }

    if (!message.trim() && !imageUrl) return;
    const newMsg = {
      sender: currentUser.id,
      text: message,
      image: imageUrl || null,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    if (!await sendMessage(order.id, newMsg)) return;
    setMessage('');
    setImageUrl('');
  };

  const handleFinish = async (e) => {
    e.preventDefault();
    if (!finishPrice || Number(finishPrice) <= 0) {
      showToast('Insira um valor final válido!', 'warning');
      return;
    }
    const finalVal = Number(finishPrice);
    if (!await changeOrderStatus(order.id, 'CONCLUIDO', finalVal)) return;
    
    if (clientComment) {
      await submitReview({ order_id: order.id, nota: clientRating, comentario: clientComment });
    }

    showToast('Trabalho finalizado com sucesso!');
    setActionModal(null);
  };

  const isReadOnly = ['RECUSADO', 'CONCLUIDO', 'CANCELADO'].includes(order.status);
  const stBadge = STATUS_BADGE[order.status] || STATUS_BADGE.PENDENTE;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl border border-slate-200/80 relative overflow-hidden animate-slide-down flex flex-col h-[86vh]">
        {/* Header */}
        <div className="bg-white border-b border-slate-200/80 px-5 py-3.5 flex items-center justify-between z-10">
          <div
            className="flex items-center gap-3 cursor-pointer group min-w-0"
            onClick={() => {
              onClose();
              if (currentUser.role === 'CONTRATANTE') setSelectedWorkerId(otherUser?.id);
              else setSelectedClientId(otherUser?.id);
            }}
          >
            <img
              src={otherUser?.foto_perfil_url}
              className="w-10 h-10 rounded-xl border border-slate-200 object-cover shrink-0"
              alt={otherUser?.nome}
            />
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#EA1D2C] transition truncate">
                {otherUser?.nome}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate">
                {srv?.titulo || 'Serviço Personalizado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`hidden sm:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-lg border ${stBadge.cls}`}>
              {stBadge.text}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-600 transition cursor-pointer"
            >
              <i className="ph-bold ph-x text-sm" />
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200/70 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <span className="flex items-center gap-1.5">
              <i className="ph-bold ph-calendar-blank text-slate-400" />
              <span>Agendamento: <strong className="text-slate-800">{order.agendamento || 'A combinar'}</strong></span>
            </span>
            <span className="sm:hidden font-bold text-[#EA1D2C]">{stBadge.text}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Valor acordado:</span>
            <span className="font-extrabold text-sm text-slate-900">
              {order.preco_final > 0 ? `R$ ${order.preco_final}` : 'Sob orçamento'}
            </span>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 bg-[#F8FAFC]" ref={chatRef}>
          {(order.chat_history || []).map((msg, i) => {
            const isMe = msg.sender === currentUser.id;
            if (msg.isBudget) {
              return (
                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-xs sm:max-w-sm w-full bg-white rounded-2xl border-2 border-amber-300/80 shadow-sm overflow-hidden">
                    <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200/60 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                        <i className="ph-fill ph-receipt text-amber-600 text-sm" /> Orçamento Formal
                      </span>
                      <span className="text-[10px] text-amber-700 font-medium">{msg.time}</span>
                    </div>
                    <div className="p-4">
                      <div className="text-xs text-slate-500">Valor proposto pelo profissional</div>
                      <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                        R$ {Number(msg.amount || order.preco_final).toFixed(2)}
                      </div>
                      {currentUser.role === 'CONTRATANTE' && order.status === 'PENDENTE' && (
                        <button
                          onClick={() => updateOrderStatus('EM_ANDAMENTO')}
                          className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <i className="ph-bold ph-check" /> Aprovar e Iniciar Serviço
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] sm:max-w-[68%] rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? 'bg-[#EA1D2C] text-white rounded-tr-xs shadow-2xs'
                    : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-2xs'
                }`}>
                  {msg.image && (
                    <img
                      src={msg.image}
                      className="max-w-full rounded-xl mb-2 object-cover max-h-60 border border-black/10"
                      alt="anexo"
                    />
                  )}
                  {msg.text && <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                  <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            );
          })}
          {(order.chat_history || []).length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
              <i className="ph-fill ph-chat-circle-dots text-4xl mb-2 text-slate-300" />
              <p className="text-xs font-semibold">Nenhuma mensagem registrada.</p>
            </div>
          )}
        </div>

        {/* Worker Actions */}
        {currentUser.role === 'TRABALHADOR' && order.status === 'PENDENTE' && (
          <div className="px-5 py-3 bg-white border-t border-slate-200/80 flex gap-2.5">
            <button
              onClick={() => updateOrderStatus('RECUSADO')}
              className="flex-1 py-2.5 bg-red-50 text-red-600 font-semibold text-xs rounded-xl hover:bg-red-100 transition border border-red-200/60 cursor-pointer"
            >
              Recusar Solicitação
            </button>
            <button
              onClick={() => updateOrderStatus('EM_ANDAMENTO')}
              className="flex-1 py-2.5 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 shadow-xs transition cursor-pointer"
            >
              Aceitar e Iniciar
            </button>
          </div>
        )}
        {currentUser.role === 'TRABALHADOR' && order.status === 'EM_ANDAMENTO' && (
          <div className="px-5 py-3 bg-white border-t border-slate-200/80 flex gap-2.5">
            <button
              onClick={() => setActionModal('CANCEL')}
              className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
            >
              Cancelar Serviço
            </button>
            <button
              onClick={() => { setFinishPrice(order.preco_final || ''); setActionModal('FINISH'); }}
              className="flex-[2] py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-xl flex justify-center items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
            >
              <i className="ph-fill ph-check-circle text-emerald-400 text-base" /> Concluir Atendimento
            </button>
          </div>
        )}

        {/* Message Input */}
        {!isReadOnly && (
          <form onSubmit={handleSend} className="p-3.5 bg-white border-t border-slate-200/80 flex flex-col gap-2.5">
            {imageUrl && (
              <div className="relative inline-block self-start">
                <img src={imageUrl} className="h-16 rounded-xl border border-slate-200 object-cover" alt="preview" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-xs border border-white"
                >
                  <i className="ph-bold ph-x" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <ImageUploader
                pathFolder={`chats/${order.id}`}
                onUploadSuccess={(url) => setImageUrl(url)}
                onError={(err) => showToast(err, 'error')}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition">
                  <i className="ph-bold ph-image text-base" />
                </div>
              </ImageUploader>

              {showBudgetInput ? (
                <div className="flex-1 flex gap-2">
                  <span className="flex items-center justify-center bg-amber-50 border border-amber-200 px-3 rounded-xl font-bold text-xs text-amber-800">
                    R$
                  </span>
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={e => setBudgetAmount(e.target.value)}
                    placeholder="Valor da proposta (ex: 150)"
                    className="flex-1 bg-amber-50/50 rounded-xl px-3.5 py-2.5 border border-amber-300 outline-none focus:border-amber-500 font-bold text-sm text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBudgetInput(false)}
                    className="px-3 bg-slate-100 rounded-xl text-slate-500 hover:bg-slate-200 cursor-pointer"
                  >
                    <i className="ph-bold ph-x text-xs" />
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 outline-none focus:border-[#EA1D2C] focus:bg-white text-sm font-medium transition"
                />
              )}

              {currentUser.role === 'TRABALHADOR' && !showBudgetInput && order.status === 'PENDENTE' && (
                <button
                  type="button"
                  onClick={() => setShowBudgetInput(true)}
                  className="h-10 px-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition shrink-0 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  title="Enviar Orçamento Formal"
                >
                  <i className="ph-bold ph-currency-dollar text-sm" />
                  <span className="hidden sm:inline">Orçamento</span>
                </button>
              )}

              <button
                type="submit"
                className={`w-10 h-10 rounded-xl ${
                  showBudgetInput ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#EA1D2C] hover:bg-[#C81422]'
                } flex items-center justify-center text-white shadow-xs transition shrink-0 cursor-pointer`}
              >
                <i className="ph-bold ph-paper-plane-right text-base" />
              </button>
            </div>
          </form>
        )}

        {order.status === 'CONCLUIDO' && currentUser.role === 'CONTRATANTE' && (
          <div className="p-3.5 bg-emerald-50 border-t border-emerald-200/60 text-center">
            <p className="text-xs font-bold text-emerald-800">Atendimento Concluído</p>
            <p className="text-[11px] text-emerald-600">Acesse o perfil do profissional para registrar sua avaliação.</p>
          </div>
        )}

        {/* Action Modals (Worker Overlay) */}
        {actionModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex flex-col justify-end animate-fade-in p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 border border-slate-200/80 animate-slide-down relative">
              <button
                onClick={() => setActionModal(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <i className="ph-bold ph-x text-sm" />
              </button>
              
              {actionModal === 'CANCEL' ? (
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
                    <i className="ph-fill ph-warning-circle text-2xl" />
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1">Confirmar cancelamento?</h3>
                  <p className="text-xs text-slate-500 mb-5">Esta ação encerrará o pedido atual e notificará o cliente.</p>
                  <button
                    onClick={() => { updateOrderStatus('CANCELADO'); setActionModal(null); }}
                    className="w-full py-3 bg-red-600 text-white font-semibold text-sm rounded-xl hover:bg-red-700 transition cursor-pointer"
                  >
                    Confirmar Cancelamento
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFinish} className="flex flex-col gap-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <i className="ph-fill ph-check-circle text-emerald-500 text-xl" /> Concluir Serviço
                  </h3>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Valor Final Cobrado (R$)</label>
                    <input
                      type="number"
                      required
                      value={finishPrice}
                      onChange={e => setFinishPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#EA1D2C] font-bold text-sm text-slate-900"
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Avalie o Cliente</label>
                    <p className="text-[11px] text-slate-400 mb-3">Seu feedback ajuda outros profissionais da comunidade.</p>
                    <div className="flex justify-center gap-2.5 mb-3">
                      {[1,2,3,4,5].map(i => (
                        <i
                          key={i}
                          onClick={() => setClientRating(i)}
                          className={`${i <= clientRating ? 'ph-fill text-amber-400' : 'ph-fill text-slate-200'} ph-star text-2xl cursor-pointer hover:scale-110 transition-transform`}
                        />
                      ))}
                    </div>
                    <textarea
                      value={clientComment}
                      onChange={e => setClientComment(e.target.value)}
                      placeholder="Comentário opcional sobre o cliente..."
                      rows="2"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#EA1D2C] text-xs resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-900 text-white font-semibold text-sm rounded-xl hover:bg-slate-800 transition cursor-pointer"
                  >
                    Finalizar e Registrar
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
