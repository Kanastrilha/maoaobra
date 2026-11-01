// src/pages/WorkerProfileDetail.jsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore, getEstimatedDistance, isWorkerOnline } from '../store';
import { getWorkingSchedule } from '../data/availability';
import StarRating from '../components/ui/StarRating';
import ReviewModal from '../components/modals/ReviewModal';

export default function WorkerProfileDetail({ workerId, onBack }) {
  const { users, workerDetails, services, reviews, currentUser, setCurrentView, showToast, orders, createOrder, submitReview } = useAppStore();
  const worker = users.find(u => u.id === workerId);
  const details = workerDetails.find(d => d.user_id === workerId);
  const workerServices = services.filter(s => s.worker_id === workerId);
  const workerReviews = reviews.filter(r => r.worker_id === workerId && !r.isWorkerReview);
  const [activeTab, setActiveTab] = useState('SOBRE');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [preselectedServiceId, setPreselectedServiceId] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const dynamicRating = workerReviews.length > 0
    ? (workerReviews.reduce((a, b) => a + b.nota, 0) / workerReviews.length).toFixed(1)
    : 'Novo';

  const userFinishedOrders = currentUser ? orders.filter(o => o.contratante_id === currentUser.id && o.worker_id === workerId && o.status === 'CONCLUIDO') : [];
  const canReview = userFinishedOrders.length > 0 && workerReviews.filter(r => r.user_id === currentUser?.id).length < userFinishedOrders.length;

  const myDetails = currentUser ? useAppStore.getState().contratanteDetails?.find(d => d.user_id === currentUser.id) || workerDetails.find(d => d.user_id === currentUser.id) : null;
  const distance = getEstimatedDistance(myDetails, details);

  const schedule = getWorkingSchedule(details);
  const finalIsOnline = isWorkerOnline(details);
  const workingHoursDisplay = `${schedule.days}, ${schedule.start} às ${schedule.end}`;

  if (!worker || !details) return <div className="p-8 text-center"><h1 className="font-bold">Profissional não encontrado</h1><button onClick={onBack} className="mt-4 text-red-600">Voltar aos resultados</button></div>;

  const handleSolicitar = async (servicoId, descricaoMsg, agendamento) => {
    const service = services.find(s => s.id === servicoId);
    if (await createOrder({ worker_id: workerId, servico_id: servicoId || null, agendamento,
      text: `Olá! Gostaria de solicitar o serviço "${service?.titulo || 'Personalizado'}".\n\nData sugerida: ${agendamento}\n\nDetalhes: ${descricaoMsg}` })) setIsRequestModalOpen(false);
  };

  const openRequest = (srvId = '') => {
    if (!currentUser) { showToast('Por favor, faça login para solicitar um serviço.', 'warning'); setCurrentView('LOGIN'); return; }
    if (currentUser.role !== 'CONTRATANTE') { showToast('Apenas contas de cliente podem solicitar serviços.', 'error'); return; }
    setPreselectedServiceId(srvId);
    setIsRequestModalOpen(true);
  };

  return (
    <div className="w-full bg-[#F8FAFC] pb-28 md:pb-16 animate-fade-in">
      {/* Top Navigation Bar over Banner */}
      <div className="relative h-44 md:h-56 bg-slate-900 overflow-hidden">
        <img
          src={details.banner_url || details.portfolio_fotos?.[0] || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=70'}
          className="w-full h-full object-cover opacity-35"
          alt="Capa"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-5 relative z-10 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-semibold px-3.5 py-2 rounded-xl border border-white/15 transition cursor-pointer"
          >
            <i className="ph-bold ph-arrow-left text-sm" />
            <span>Voltar aos resultados</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-16 md:-mt-20 relative z-20">
        {/* Profile Header Card */}
        <div className="card-pro rounded-2xl p-5 md:p-7">
          <div className="flex flex-col md:flex-row gap-5 md:items-center">
            <div className="relative shrink-0 -mt-14 md:-mt-16">
              <img
                src={worker.foto_perfil_url}
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
                alt={worker.nome}
              />
              <span
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                  finalIsOnline ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#EA1D2C] bg-red-50 px-2.5 py-0.5 rounded-md">
                      {details.categorias?.join(' • ')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                      <i className="ph-fill ph-seal-check text-sky-500" /> Perfil aprovado na demonstração
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
                    {worker.nome}
                  </h1>
                </div>

                <div className={`self-start sm:self-auto px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                  finalIsOnline
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${finalIsOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {finalIsOnline ? 'Disponível para atendimento' : 'Fora do expediente'}
                </div>
              </div>

              {/* Metrics Strip */}
              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Avaliação Média</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <i className="ph-fill ph-star text-amber-400 text-base" />
                    <span className="font-extrabold text-base text-slate-900">{dynamicRating > 0 ? dynamicRating : 'Novo'}</span>
                    <span className="text-xs text-slate-400">({workerReviews.length})</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Catálogo</span>
                  <div className="font-extrabold text-base text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <i className="ph-fill ph-briefcase text-slate-400 text-sm" />
                    <span>{workerServices.length} {workerServices.length === 1 ? 'serviço' : 'serviços'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Expediente</span>
                  <div className="font-bold text-xs sm:text-sm text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <i className="ph-fill ph-clock text-[#EA1D2C] text-sm shrink-0" />
                    <span className="truncate">{workingHoursDisplay}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Localização</span>
                  <div className="font-bold text-xs sm:text-sm text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <i className="ph-fill ph-map-pin text-[#EA1D2C] text-sm shrink-0" />
                    <span className="truncate">
                      {details.cidade ? `${details.cidade}, ${details.uf}` : 'Brasil'}
                      {distance ? ` (~${distance} km)` : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Navigation Tabs */}
            <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 w-fit">
              <button
                onClick={() => setActiveTab('SOBRE')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'SOBRE' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Catálogo & Sobre
              </button>
              <button
                onClick={() => setActiveTab('AVALIACOES')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'AVALIACOES' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Avaliações</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${activeTab === 'AVALIACOES' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {workerReviews.length}
                </span>
              </button>
            </div>

            {activeTab === 'SOBRE' && (
              <>
                {/* Bio */}
                <section className="card-pro rounded-2xl p-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <i className="ph-fill ph-user-focus text-[#EA1D2C] text-base" /> Apresentação Profissional
                  </h2>
                  <p className="text-slate-700 text-sm leading-relaxed">{details.bio}</p>
                </section>

                {/* Services */}
                <section className="card-pro rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <i className="ph-fill ph-list-checks text-[#EA1D2C] text-base" /> Tabela de Serviços e Preços Base
                    </h2>
                    <span className="text-xs font-medium text-slate-400">{workerServices.length} itens</span>
                  </div>

                  <div className="space-y-3">
                    {workerServices.length === 0 ? (
                      <p className="text-xs text-slate-500 bg-slate-50 p-5 rounded-xl border border-slate-100 text-center">
                        Nenhum serviço tabelado cadastrado. Solicite um orçamento personalizado ao lado.
                      </p>
                    ) : workerServices.map(srv => (
                      <div
                        key={srv.id}
                        className="border border-slate-200/70 hover:border-slate-300 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition bg-white"
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 border border-slate-200/60">
                            <img
                              src={srv.imagem_url || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200&q=80'}
                              className="w-full h-full object-cover"
                              alt={srv.titulo}
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">{srv.titulo}</h4>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{srv.descricao}</p>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0 gap-2">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-slate-400 font-medium uppercase block">A partir de</span>
                            <span className="font-extrabold text-slate-900 text-base">R$ {srv.preco_base}</span>
                          </div>
                          <button
                            onClick={() => openRequest(srv.id)}

                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                              finalIsOnline
                                ? 'bg-red-50 text-[#EA1D2C] hover:bg-[#EA1D2C] hover:text-white'
                                : 'bg-[#EA1D2C] text-white hover:bg-[#C81422]'
                            }`}
                          >
                            Selecionar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Portfolio */}
                {details.portfolio_fotos?.length > 0 && (
                  <section className="card-pro rounded-2xl p-6">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                      <i className="ph-fill ph-images text-[#EA1D2C] text-base" /> Galeria de Trabalhos Realizados
                    </h2>
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                      {details.portfolio_fotos.map((foto, i) => (
                        <img
                          key={i}
                          src={foto}
                          className="w-44 h-36 rounded-xl object-cover shrink-0 border border-slate-200/80"
                          alt={`Portfólio ${i + 1}`}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {activeTab === 'AVALIACOES' && (
              <div className="card-pro p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Avaliações de Clientes Verificados</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Opiniões reais de quem já contratou este profissional</p>
                  </div>
                  {canReview && (
                    <button
                      onClick={() => setIsReviewModalOpen(true)}
                      className="bg-[#EA1D2C] hover:bg-[#C81422] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      Avaliar Atendimento
                    </button>
                  )}
                </div>

                {workerReviews.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100">
                    <i className="ph-fill ph-star text-3xl text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500 font-medium">Este profissional ainda não recebeu avaliações.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workerReviews.map(r => {
                      const u = users.find(x => x.id === r.user_id);
                      return (
                        <div key={r.id} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
                          <div className="flex justify-between items-start mb-2.5">
                            <div className="flex items-center gap-2.5">
                              <img src={u?.foto_perfil_url} className="w-9 h-9 rounded-full object-cover border border-slate-200" alt={u?.nome} />
                              <div>
                                <div className="font-bold text-slate-900 text-xs">{u?.nome}</div>
                                <div className="text-[10px] text-slate-400 font-medium">{r.data}</div>
                              </div>
                            </div>
                            <StarRating rating={r.nota} />
                          </div>
                          <p className="text-slate-600 text-xs leading-relaxed">{r.comentario}</p>
                          {r.fotos?.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {r.fotos.map((f, i) => (
                                <img key={i} src={f} className="w-14 h-14 rounded-lg object-cover border border-slate-200" alt="anexo" />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Sticky Booking Box */}
          <div className="hidden lg:block">
            <div className="card-pro p-6 rounded-2xl sticky top-24">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Atendimento</span>
                  <span className="font-bold text-sm text-slate-900">{workingHoursDisplay}</span>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${finalIsOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </div>

              <button
                onClick={() => openRequest('')}

                className={`w-full font-semibold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition mb-3 cursor-pointer ${
                  finalIsOnline
                    ? 'bg-[#EA1D2C] text-white shadow-sm shadow-red-500/20 hover:bg-[#C81422]'
                    : 'bg-[#EA1D2C] text-white hover:bg-[#C81422]'
                }`}
              >
                <i className="ph-bold ph-calendar-check text-base" />
                <span>{finalIsOnline ? 'Solicitar Orçamento' : 'Solicitar para depois'}</span>
              </button>

              <button
          type="button"
          onClick={() => showToast('O contato por WhatsApp está desativado nesta demonstração.', 'info')}
                className="w-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-semibold text-sm py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-100/80 transition"
              >
                <i className="ph-fill ph-whatsapp-logo text-lg" />
                <span>Contato via WhatsApp</span>
              </button>

              <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <i className="ph-fill ph-shield-check text-emerald-500 text-sm shrink-0" />
                  <span>Negociação direta e sem taxas ocultas</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="ph-fill ph-chat-centered-text text-slate-400 text-sm shrink-0" />
                  <span>Histórico registrado no chat do pedido</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="lg:hidden fixed bottom-0 w-full glass-header border-t border-slate-200/80 p-3.5 flex gap-2.5 z-50">
        <button
          type="button"
          onClick={() => showToast('O contato por WhatsApp está desativado nesta demonstração.', 'info')}
          className="bg-emerald-600 text-white rounded-xl px-4 flex items-center justify-center shadow-xs"
        >
          <i className="ph-fill ph-whatsapp-logo text-xl" />
        </button>
        <button
          onClick={() => openRequest('')}

          className={`flex-1 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 py-3.5 ${
            finalIsOnline ? 'bg-[#EA1D2C] text-white shadow-xs' : 'bg-[#EA1D2C] text-white'
          }`}
        >
          <i className="ph-bold ph-calendar-check text-base" />
          <span>{finalIsOnline ? 'Solicitar Orçamento' : 'Solicitar para depois'}</span>
        </button>
      </div>

      {/* Modals */}
      {isRequestModalOpen && (
        <RequestModal
          workerServices={workerServices}
          initialServiceId={preselectedServiceId}
          onClose={() => setIsRequestModalOpen(false)}
          onSubmit={handleSolicitar}
          showToast={showToast}
        />
      )}
      {isReviewModalOpen && (
        <ReviewModal
          onSubmit={async (nota, comentario) => {
            const order = userFinishedOrders.find(o => !workerReviews.some(r => r.order_id === o.id && r.user_id === currentUser.id));
            if (order && await submitReview({ order_id: order.id, nota, comentario })) setIsReviewModalOpen(false);
          }}
          onClose={() => setIsReviewModalOpen(false)}
          isWorkerReview={false}
        />
      )}
    </div>
  );
}

function RequestModal({ workerServices, initialServiceId = '', onClose, onSubmit, showToast }) {
  const [desc, setDesc] = useState('');
  const [selectedSrvId, setSelectedSrvId] = useState(initialServiceId);
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [horaAgendamento, setHoraAgendamento] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inp = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-3 focus:ring-red-500/15 focus:border-[#EA1D2C] outline-none bg-slate-50/70 focus:bg-white text-sm font-medium text-slate-900 transition";

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl relative animate-slide-down border border-slate-200/80 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#EA1D2C] flex items-center justify-center">
              <i className="ph-fill ph-calendar-plus text-lg" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Solicitar Serviço</h2>
              <p className="text-xs text-slate-500">Proponha uma data e descreva sua necessidade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center transition cursor-pointer"
          >
            <i className="ph-bold ph-x text-sm" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Serviço desejado</label>
            <select value={selectedSrvId} onChange={e => setSelectedSrvId(e.target.value)} className={inp}>
              <option value="">Orçamento Personalizado (Valor a combinar)</option>
              {workerServices.map(s => (
                <option key={s.id} value={s.id}>{s.titulo} — Base: R$ {s.preco_base}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Data sugerida</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={dataAgendamento}
                onChange={e => setDataAgendamento(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Horário</label>
              <input
                type="time"
                value={horaAgendamento}
                onChange={e => setHoraAgendamento(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descrição da solicitação</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              maxLength={500}
              placeholder="Descreva o problema ou serviço com detalhes para agilizar o orçamento..."
              className={inp + ' resize-none h-24'}
            />
            <p className="text-[11px] text-slate-400 text-right mt-1">{desc.length}/500</p>
          </div>
        </div>

        <button
          disabled={submitting}
          onClick={async () => {
            if (submitting) return;
            if (!dataAgendamento || !horaAgendamento) { showToast('Por favor, selecione data e horário.', 'error'); return; }
            if (desc.trim().length > 10) {
              const dataStr = `${dataAgendamento.split('-').reverse().join('/')} às ${horaAgendamento}`;
              setSubmitting(true);
              try { await onSubmit(selectedSrvId || null, desc, dataStr); } finally { setSubmitting(false); }
            } else {
              showToast('Descreva com mais detalhes (mínimo 10 caracteres).', 'warning');
            }
          }}
          className="w-full mt-4 bg-[#EA1D2C] hover:bg-[#C81422] text-white font-semibold text-sm py-3 rounded-xl shadow-sm shadow-red-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <i className="ph-bold ph-paper-plane-right text-sm" />
          <span>{submitting ? 'Enviando...' : 'Enviar Solicitação'}</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
