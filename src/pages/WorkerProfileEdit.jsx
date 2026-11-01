import { useState } from 'react';
import { useAppStore } from '../store';
import { maskCPF, formatPhone } from '../utils/security';
import { getWorkingSchedule } from '../data/availability';
import Header from '../components/ui/Header';
import ImageUploader from '../components/ui/ImageUploader';

export default function WorkerProfileEdit() {
  const { currentUser, workerDetails, logout, deleteMyAccount, reviews, users, setWorkerDetails, showToast, setUsers } = useAppStore();
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState('');

  const details = workerDetails.find(d => d.user_id === currentUser.id);
  const myReviews = reviews.filter(r => r.worker_id === currentUser.id && !r.isWorkerReview);
  const dynamicRating = myReviews.length > 0
    ? (myReviews.reduce((a, b) => a + b.nota, 0) / myReviews.length).toFixed(1)
    : 'Novo';

  const inp = "w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 outline-none focus:border-[#EA1D2C] bg-white font-medium text-slate-800";

  return (
    <div className="pb-24 animate-fade-in w-full">
      <Header
        title="Configurações Profissionais"
        subtitle="Gerencie seu horário de expediente, status online, informações públicas e privacidade"
      />
      <div className="max-w-5xl mx-auto px-4 md:px-8 space-y-6">
        {/* Hero Card */}
        <div className="card-pro rounded-2xl overflow-hidden">
          <div className="h-36 bg-slate-900 relative">
            <img
              src={details?.banner_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=60'}
              className="w-full h-full object-cover opacity-40"
              alt="Capa"
            />
            <ImageUploader
              pathFolder={`users/${currentUser.id}/banner`}
              className="absolute top-3.5 right-3.5"
              onUploadSuccess={async (url) => { if (!await setWorkerDetails(items => items.map(d => d.user_id === currentUser.id ? { ...d, banner_url: url } : d))) return; showToast('Banner atualizado!'); }}
              onError={(err) => showToast(err, 'error')}
            >
              <div role="button" className="bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-xl backdrop-blur-md transition border border-white/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                <i className="ph-bold ph-camera" /> Alterar Capa
              </div>
            </ImageUploader>
          </div>

          <div className="p-6 flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-12 relative">
            <div className="relative shrink-0">
              <img
                src={currentUser.foto_perfil_url}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
                alt={currentUser.nome}
              />
              <ImageUploader
                pathFolder={`users/${currentUser.id}/avatar`}
                className="absolute -bottom-1.5 -right-1.5"
                onUploadSuccess={async (url) => { if (!await setUsers(items => items.map(u => u.id === currentUser.id ? { ...u, foto_perfil_url: url } : u))) return; showToast('Foto atualizada!'); }}
                onError={(err) => showToast(err, 'error')}
              >
                <div role="button" className="bg-[#EA1D2C] text-white w-8 h-8 flex items-center justify-center rounded-xl shadow-xs hover:bg-[#C81422] transition border-2 border-white cursor-pointer">
                  <i className="ph-bold ph-pencil-simple text-xs" />
                </div>
              </ImageUploader>
            </div>

            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#EA1D2C] bg-red-50 px-2 py-0.5 rounded-md">
                  {details?.categorias?.[0]}
                </span>
                <span className="text-[11px] font-medium text-slate-400">CPF: {maskCPF(details?.cpf)}</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">{currentUser.nome}</h2>
            </div>

            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/60">
              <i className="ph-fill ph-star text-amber-400 text-base" />
              <span className="font-extrabold text-sm text-slate-900">{dynamicRating}</span>
              <span className="text-xs text-slate-400 font-medium">({myReviews.length})</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Disponibilidade */}
            <div className="card-pro rounded-2xl p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <i className="ph-fill ph-clock text-[#EA1D2C] text-base" /> Expediente & Disponibilidade
              </h3>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">Receber Solicitações (Online)</div>
                    <div className="text-[11px] text-slate-500">Habilita chamadas dentro do horário comercial</div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!await setWorkerDetails(items => items.map(w => w.user_id === currentUser.id ? { ...w, isOnline: !w.isOnline } : w))) return;
                      showToast(details?.isOnline ? 'Você está offline.' : 'Você está online!', details?.isOnline ? 'warning' : 'success');
                    }}
                    className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${details?.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all shadow-2xs ${details?.isOnline ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-900 text-xs mb-2">Horário de Atendimento</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      defaultValue={getWorkingSchedule(details).start}
                      onBlur={async e => { if (!await setWorkerDetails(items => items.map(w => w.user_id === currentUser.id ? { ...w, horaInicio: e.target.value } : w))) return; showToast('Horário inicial salvo!'); }}
                      className={inp}
                    />
                    <span className="text-xs font-semibold text-slate-400">às</span>
                    <input
                      type="time"
                      defaultValue={getWorkingSchedule(details).end}
                      onBlur={async e => { if (!await setWorkerDetails(items => items.map(w => w.user_id === currentUser.id ? { ...w, horaFim: e.target.value } : w))) return; showToast('Horário final salvo!'); }}
                      className={inp}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="font-bold text-slate-900 text-xs mb-2">Dias de Atendimento</div>
                  <select
                    defaultValue={details?.diasTrabalho || details?.workingHours?.split(',')[0] || 'Seg-Sex'}
                    onChange={async e => {
                      if (!await setWorkerDetails(items => items.map(w => w.user_id === currentUser.id ? { ...w, diasTrabalho: e.target.value } : w))) return;
                      showToast('Dias de trabalho salvos!');
                    }}
                    className={inp + ' cursor-pointer'}
                  >
                    <option value="Seg-Sex">Segunda a Sexta</option>
                    <option value="Seg-Sab">Segunda a Sábado</option>
                    <option value="Todos os dias">Todos os dias</option>
                    <option value="Finais de semana">Apenas Finais de Semana</option>
                    <option value="A combinar">A combinar</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contato e Bio */}
            <div className="card-pro rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
                  <i className="ph-fill ph-whatsapp-logo text-emerald-500 text-base" /> WhatsApp Comercial
                </h3>
                <input
                  type="tel"
                  defaultValue={currentUser.telefone}
                  onBlur={async e => {
                    const novoTel = formatPhone(e.target.value);
                    if (!await setUsers(items => items.map(u => u.id === currentUser.id ? { ...u, telefone: novoTel } : u))) return;

                    showToast('WhatsApp público atualizado!');
                  }}
                  className={inp}
                  placeholder="(11) 90000-0000"
                />
              </div>

              <div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <i className="ph-fill ph-text-aa text-[#EA1D2C] text-base" /> Apresentação (Bio)
                  </h3>
                  {!isEditingBio && (
                    <button
                      onClick={async () => { setTempBio(details?.bio || ''); setIsEditingBio(true); }}
                      className="text-xs font-semibold text-[#EA1D2C] hover:underline cursor-pointer"
                    >
                      Editar
                    </button>
                  )}
                </div>
                {isEditingBio ? (
                  <div className="animate-fade-in">
                    <textarea
                      value={tempBio}
                      onChange={e => setTempBio(e.target.value)}
                      rows="4"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#EA1D2C] bg-slate-50 mb-2.5 text-xs resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => { if (!await setWorkerDetails(items => items.map(w => w.user_id === currentUser.id ? { ...w, bio: tempBio } : w))) return; setIsEditingBio(false); showToast('Bio atualizada!'); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setIsEditingBio(false)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 leading-relaxed">{details?.bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Reviews & Account Controls */}
          <div className="card-pro rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                <i className="ph-fill ph-star text-amber-400 text-base" /> Avaliações Recebidas
              </h3>
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {myReviews.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl">
                    <i className="ph-fill ph-star text-3xl text-slate-300 mb-1.5" />
                    <p className="text-xs text-slate-500">Nenhuma avaliação recebida ainda.</p>
                  </div>
                ) : myReviews.map(r => {
                  const c = users.find(u => u.id === r.user_id);
                  return (
                    <div key={r.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <img src={c?.foto_perfil_url} className="w-7 h-7 rounded-full object-cover" alt={c?.nome} />
                          <span className="font-bold text-xs text-slate-900">{c?.nome || 'Cliente'}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <i key={i} className={`text-xs ph-fill ph-star ${i <= r.nota ? 'text-amber-400' : 'text-slate-200'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">{r.comentario}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={deleteMyAccount}
                className="w-full sm:w-auto text-xs font-semibold text-slate-400 hover:text-red-600 py-2 px-3 rounded-xl hover:bg-red-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="ph-bold ph-trash text-sm" /> Excluir Minha Conta (LGPD)
              </button>
              <button
                onClick={logout}
                className="w-full sm:w-auto bg-slate-900 text-white font-semibold text-xs py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition cursor-pointer"
              >
                <i className="ph-bold ph-sign-out text-sm" /> Encerrar Sessão
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
