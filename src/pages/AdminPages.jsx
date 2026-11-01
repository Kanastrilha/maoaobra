// src/pages/AdminPages.jsx — AdminClients, AdminWorkers, AdminApprovals, AdminSupport, AdminChats
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../store';
import Header from '../components/ui/Header';

// ---- AdminUserDetailModal ----
function AdminUserDetailModal({ user, onClose }) {
  const { workerDetails, contratanteDetails, orders, services, users } = useAppStore();
  if (!user) return null;
  const details = user.role === 'CONTRATANTE' ? contratanteDetails.find(d => d.user_id === user.id) : workerDetails.find(d => d.user_id === user.id);
  const userOrders = user.role === 'CONTRATANTE' ? orders.filter(o => o.contratante_id === user.id) : orders.filter(o => o.worker_id === user.id);

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl max-h-[88vh] rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-slide-down">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <i className="ph-fill ph-identification-badge text-[#EA1D2C] text-lg" /> Ficha Cadastral do Usuário
          </h3>
          <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-200 transition cursor-pointer">
            <i className="ph-bold ph-x text-sm" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="flex items-center gap-4">
            <img src={user.foto_perfil_url} className="w-18 h-18 rounded-2xl object-cover border border-slate-200" alt={user.nome} />
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  user.role === 'CONTRATANTE' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {user.role}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500">ID: {user.id}</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">{user.nome}</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Cadastrado em {new Date(user.data_criacao).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Contato & Documento</h4>
              <p className="font-semibold text-slate-800 text-xs">{user.email}</p>
              <p className="font-semibold text-slate-800 text-xs mt-1">{user.telefone}</p>
              <p className="font-semibold text-slate-600 text-xs mt-1">CPF: {details?.cpf || '—'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Endereço</h4>
              <p className="font-semibold text-slate-800 text-xs">{details?.rua ? `${details.rua}, ${details.numero}` : '—'}</p>
              <p className="text-xs text-slate-500 mt-1">{details?.bairro} {details?.cidade ? `• ${details.cidade}/${details.uf}` : ''}</p>
              <p className="text-xs text-slate-400 mt-0.5">CEP: {details?.cep || '—'}</p>
            </div>
          </div>

          {user.role === 'TRABALHADOR' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Dados Profissionais ({details?.categorias?.join(', ')})</h4>
              <p className="text-xs text-slate-700 leading-relaxed">{details?.bio}</p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 border-b border-slate-100 pb-2">
              Histórico de Pedidos ({userOrders.length})
            </h4>
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {userOrders.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl text-center">Nenhuma atividade registrada.</p>
              ) : userOrders.map(o => {
                const srv = services.find(s => s.id === o.servico_id);
                const other = users.find(u => u.id === (user.role === 'CONTRATANTE' ? o.worker_id : o.contratante_id));
                return (
                  <div key={o.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        o.status === 'CONCLUIDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {o.status}
                      </span>
                      <p className="text-xs font-bold text-slate-900 mt-1">{srv?.titulo || 'Serviço Personalizado'}</p>
                      <p className="text-[11px] text-slate-500">com {other?.nome}</p>
                    </div>
                    <div className="font-extrabold text-sm text-slate-900">R$ {o.preco_final}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---- AdminListLayout ----
function AdminListLayout({ title, subtitle, usersList }) {
  const [selectedUser, setSelectedUser] = useState(null);
  return (
    <div className="pb-24 animate-fade-in w-full">
      <Header title={title} subtitle={subtitle} />
      <div className="px-4 md:px-8 max-w-7xl mx-auto">
        <div className="card-pro rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200/70">
                <tr>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Usuário</th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden md:table-cell">Contato</th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Data de Cadastro</th>
                  <th className="py-3.5 px-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-slate-400 text-xs font-medium">Nenhum registro encontrado.</td>
                  </tr>
                ) : usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img src={u.foto_perfil_url} className="w-9 h-9 rounded-xl object-cover border border-slate-200" alt={u.nome} />
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900">{u.nome}</div>
                          <div className="text-[11px] text-slate-400 md:hidden">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 hidden md:table-cell">
                      <div className="text-xs font-semibold text-slate-800">{u.email}</div>
                      <div className="text-[11px] text-slate-400">{u.telefone}</div>
                    </td>
                    <td className="py-3.5 px-5 hidden sm:table-cell text-xs font-medium text-slate-500">
                      {new Date(u.data_criacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs transition cursor-pointer"
                        >
                          Ficha Completa
                        </button>
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => useAppStore.getState().deleteUser(u.id)}
                            title="Banir usuário"
                            className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white p-1.5 rounded-lg text-xs transition border border-red-200/60 cursor-pointer"
                          >
                            <i className="ph-bold ph-trash" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {selectedUser && <AdminUserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}

export function AdminClients() {
  const { users } = useAppStore();
  return <AdminListLayout title="Base de Clientes" subtitle="Usuários contratantes cadastrados na plataforma" usersList={users.filter(u => u.role === 'CONTRATANTE')} />;
}

export function AdminWorkers() {
  const { users } = useAppStore();
  return <AdminListLayout title="Profissionais Credenciados" subtitle="Prestadores de serviço ativos e verificados" usersList={users.filter(u => u.role === 'TRABALHADOR' && u.status === 'APPROVED')} />;
}

export function AdminApprovals() {
  const { users, workerDetails, approveWorker, rejectWorker } = useAppStore();
  const pending = users.filter(u => u.role === 'TRABALHADOR' && u.status === 'PENDING');
  return (
    <div className="pb-24 animate-fade-in w-full">
      <Header title="Curadoria de Novos Profissionais" subtitle="Analise e aprove cadastros pendentes de prestadores" />
      <div className="px-4 md:px-8 space-y-4 max-w-5xl mx-auto">
        {pending.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200/80 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-3">
              <i className="ph-fill ph-check-circle text-2xl" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Fila de aprovação zerada</h3>
            <p className="text-xs text-slate-500">Todas as solicitações de credenciamento foram processadas.</p>
          </div>
        ) : pending.map(w => {
          const d = workerDetails.find(x => x.user_id === w.id);
          return (
            <div key={w.id} className="card-pro p-6 rounded-2xl flex flex-col md:flex-row gap-6">
              <div className="shrink-0 flex flex-col items-center gap-2">
                <img src={w.foto_perfil_url} className="w-20 h-20 rounded-2xl border border-slate-200 object-cover" alt={w.nome} />
                <span className="bg-red-50 text-[#EA1D2C] px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase">
                  {d?.categorias?.[0]}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-lg font-extrabold text-slate-900">{w.nome}</h3>
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                    Aguardando Análise
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Contato</span>
                    <span className="font-semibold text-slate-800">{w.email} • {w.telefone}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">CPF & Local</span>
                    <span className="font-semibold text-slate-800">{d?.cpf} • {d?.cidade}/{d?.uf}</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Apresentação</span>
                  <p className="text-xs text-slate-700 italic">"{d?.bio}"</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={() => { if (window.confirm('Recusar e excluir este cadastro?')) rejectWorker(w.id); }}
                    className="flex-1 bg-red-50 text-red-600 font-semibold text-xs py-2.5 rounded-xl hover:bg-red-100 transition border border-red-200/60 cursor-pointer"
                  >
                    Recusar Cadastro
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Aprovar este profissional?')) approveWorker(w.id); }}
                    className="flex-1 bg-emerald-600 text-white font-semibold text-xs py-2.5 rounded-xl hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Aprovar e Credenciar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminSupport() {
  const { supportTickets, sendTicketMessage, closeTicket, users } = useAppStore();
  const [replyMsg, setReplyMsg] = useState({});
  const [activeTicketId, setActiveTicketId] = useState(null);

  const handleReply = async (ticketId) => {
    if (!replyMsg[ticketId]) return;
    if (!await sendTicketMessage(ticketId, replyMsg[ticketId])) return;
    setReplyMsg({ ...replyMsg, [ticketId]: '' });
  };

  const openTickets = supportTickets.filter(t => t.status === 'OPEN');

  return (
    <div className="pb-24 animate-fade-in w-full">
      <Header
        title={activeTicketId ? 'Atendimento de Chamado' : 'Central de Suporte'}
        subtitle="Gerencie dúvidas e solicitações enviadas pelos usuários"
        showBack={!!activeTicketId}
        onBack={() => setActiveTicketId(null)}
      />
      <div className="px-4 md:px-8 max-w-5xl mx-auto">
        {!activeTicketId ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openTickets.map(t => {
                const u = users.find(x => x.id === t.user_id);
                const last = t.messages[t.messages.length - 1];
                return (
                  <div key={t.id} className="card-pro rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-3 border-b border-slate-100 pb-3">
                        <img src={u?.foto_perfil_url} className="w-9 h-9 rounded-xl object-cover" alt={u?.nome} />
                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900">{u?.nome}</h4>
                          <p className="text-[11px] text-slate-400">{u?.email}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Última Mensagem</p>
                      <p className="text-xs text-slate-600 line-clamp-2 italic mb-4">"{last?.text}"</p>
                    </div>
                    <button
                      onClick={() => setActiveTicketId(t.id)}
                      className="w-full bg-slate-900 text-white font-semibold text-xs py-2.5 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <i className="ph-bold ph-chat-teardrop-text" /> Atender Chamado
                    </button>
                  </div>
                );
              })}
            </div>
            {openTickets.length === 0 && (
              <div className="text-center p-12 bg-white rounded-2xl border border-slate-200/80 max-w-md mx-auto">
                <i className="ph-fill ph-check-circle text-4xl text-emerald-500 mb-2" />
                <h3 className="font-bold text-base text-slate-900">Nenhum ticket em aberto</h3>
                <p className="text-slate-500 text-xs mt-0.5">Todos os chamados de suporte foram respondidos.</p>
              </div>
            )}
          </>
        ) : openTickets.filter(t => t.id === activeTicketId).map(t => {
          const u = users.find(x => x.id === t.user_id);
          return (
            <div key={t.id} className="card-pro rounded-2xl p-5 flex flex-col animate-fade-in">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-3">
                  <img src={u?.foto_perfil_url} className="w-9 h-9 rounded-xl object-cover" alt={u?.nome} />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{u?.nome}</h4>
                    <p className="text-xs text-slate-400">{u?.email}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (window.confirm('Encerrar ticket?')) {
                      if (!await closeTicket(t.id)) return;
                      setActiveTicketId(null);
                    }
                  }}
                  className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-red-100 transition border border-red-200/60 cursor-pointer"
                >
                  Encerrar Chamado
                </button>
              </div>
              <div className="bg-slate-50 h-80 overflow-y-auto p-4 rounded-xl mb-4 space-y-3 border border-slate-100">
                {t.messages.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-2 ${msg.sender === 'ADMIN' ? 'justify-end' : ''}`}>
                    <div className={`p-3 rounded-2xl text-xs shadow-2xs max-w-[80%] ${
                      msg.sender === 'ADMIN'
                        ? 'bg-[#EA1D2C] text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      <div className={`text-[10px] mt-1 text-right ${msg.sender === 'ADMIN' ? 'text-white/70' : 'text-slate-400'}`}>{msg.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyMsg[t.id] || ''}
                  onChange={e => setReplyMsg({ ...replyMsg, [t.id]: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleReply(t.id)}
                  placeholder="Escreva a resposta oficial do suporte..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EA1D2C] focus:bg-white"
                />
                <button
                  onClick={() => handleReply(t.id)}
                  className="px-5 rounded-xl bg-[#EA1D2C] text-white text-xs font-semibold hover:bg-[#C81422] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="ph-bold ph-paper-plane-right" /> Enviar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminChats() {
  const { orders, users, services } = useAppStore();
  const activeChats = orders.filter(o => o.chat_history?.length > 0 && ['PENDENTE','ACEITO','EM_ANDAMENTO'].includes(o.status));
  return (
    <div className="pb-24 animate-fade-in w-full">
      <Header title="Auditoria de Conversas" subtitle="Supervisão das negociações ativas entre clientes e prestadores" />
      <div className="px-4 md:px-8 space-y-5 max-w-5xl mx-auto">
        {activeChats.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200/80 max-w-md mx-auto">
            <i className="ph-fill ph-chats-teardrop text-4xl text-slate-300 mb-2" />
            <h3 className="font-bold text-base text-slate-900">Nenhum chat ativo no momento</h3>
          </div>
        ) : activeChats.map(o => {
          const worker = users.find(u => u.id === o.worker_id);
          const client = users.find(u => u.id === o.contratante_id);
          const srv = services.find(s => s.id === o.servico_id);
          return (
            <div key={o.id} className="card-pro rounded-2xl p-5">
              <div className="flex justify-between items-center mb-3.5 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">{srv?.titulo || 'Serviço Personalizado'}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Profissional: <strong className="text-slate-800">{worker?.nome}</strong> • Cliente: <strong className="text-slate-800">{client?.nome}</strong>
                  </p>
                </div>
                <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-amber-200">
                  {o.status}
                </span>
              </div>
              <div className="bg-slate-50 h-56 overflow-y-auto p-4 rounded-xl space-y-2.5 border border-slate-100">
                {o.chat_history.map((msg, i) => {
                  const isWorker = msg.sender === worker?.id;
                  const sender = isWorker ? worker : client;
                  return (
                    <div key={i} className={`flex items-start gap-2 ${isWorker ? 'justify-end' : ''}`}>
                      <div className={`p-3 rounded-2xl text-xs shadow-2xs max-w-[80%] ${
                        isWorker ? 'bg-slate-900 text-white rounded-tr-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      }`}>
                        <p className={`text-[10px] font-bold mb-0.5 ${isWorker ? 'text-red-400' : 'text-[#EA1D2C]'}`}>{sender?.nome}</p>
                        {msg.image && <img src={msg.image} className="max-w-full rounded-lg mb-2 object-cover max-h-40" alt="anexo" />}
                        {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                        <div className={`text-[9px] mt-1 text-right ${isWorker ? 'text-white/60' : 'text-slate-400'}`}>{msg.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
