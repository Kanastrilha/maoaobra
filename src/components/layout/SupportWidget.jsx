// src/components/layout/SupportWidget.jsx
import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store';

export default function SupportWidget() {
  const { currentUser, currentView, supportTickets, sendTicketMessage, showToast } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const chatRef = useRef(null);

  const myTicket = currentUser ? supportTickets.find(t => t.user_id === currentUser.id && t.status === 'OPEN') : null;

  useEffect(() => {
    if (isOpen && chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [isOpen, myTicket?.messages]);

  const adminViews = ['ADMIN_DASH','ADMIN_CLIENTS','ADMIN_WORKERS','ADMIN_APPROVALS','ADMIN_SUPPORT','ADMIN_CHATS'];
  if (adminViews.includes(currentView)) return null;

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!currentUser) { showToast('Faça login para usar o suporte.', 'warning'); return; }
    if (await sendTicketMessage(myTicket?.id, message)) setMessage('');
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[9990]">
      {isOpen ? (
        <div className="bg-white w-80 sm:w-88 rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-slide-down h-[420px]">
          <div className="bg-slate-900 px-4 py-3.5 flex justify-between items-center text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EA1D2C] flex items-center justify-center text-white">
                <i className="ph-fill ph-headset text-lg" />
              </div>
              <div>
                <h4 className="font-bold text-xs leading-tight">Central de Ajuda</h4>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Atendimento Online
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer">
              <i className="ph-bold ph-x text-sm" />
            </button>
          </div>

          <div className="flex-1 bg-slate-50 p-4 overflow-y-auto flex flex-col gap-3" ref={chatRef}>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0 mt-0.5">
                <i className="ph-bold ph-sparkle text-xs" />
              </div>
              <div className="bg-white border border-slate-200/80 p-3 rounded-2xl rounded-tl-xs text-xs text-slate-700 shadow-2xs leading-relaxed">
                Olá{currentUser ? `, ${currentUser.nome.split(' ')[0]}` : ''}! Precisa de ajuda com algum pedido ou cadastro? Envie sua mensagem abaixo.
              </div>
            </div>
            {myTicket?.messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-2 ${msg.sender === 'USER' ? 'justify-end' : ''}`}>
                {msg.sender === 'ADMIN' && (
                  <div className="w-7 h-7 rounded-lg bg-[#EA1D2C] flex items-center justify-center text-white shrink-0 mt-0.5">
                    <i className="ph-bold ph-headset text-xs" />
                  </div>
                )}
                <div className={`p-3 rounded-2xl text-xs shadow-2xs max-w-[82%] leading-relaxed ${
                  msg.sender === 'USER'
                    ? 'bg-[#EA1D2C] text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs'
                }`}>
                  {msg.text}
                  <div className={`text-[10px] mt-1 text-right ${msg.sender === 'USER' ? 'text-white/70' : 'text-slate-400'}`}>{msg.time}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-200/80 bg-white flex gap-2">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Escreva sua mensagem..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-[#EA1D2C] focus:bg-white transition"
            />
            <button
              onClick={handleSend}
              className="w-9 h-9 rounded-xl bg-[#EA1D2C] text-white flex items-center justify-center hover:bg-[#C81422] transition shrink-0 cursor-pointer shadow-xs"
            >
              <i className="ph-bold ph-paper-plane-right text-sm" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          title="Suporte mãoAobra"
          className="h-11 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex items-center gap-2 shadow-lg shadow-slate-900/20 hover:scale-105 transition-all border border-slate-700/60 relative cursor-pointer"
        >
          <i className="ph-fill ph-chat-teardrop-dots text-lg text-[#EA1D2C]" />
          <span className="text-xs font-semibold hidden sm:inline">Suporte</span>
          {myTicket?.messages.some(m => m.sender === 'ADMIN') && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          )}
        </button>
      )}
    </div>
  );
}
