// src/pages/HomeContratante.jsx
import { useState } from 'react';
import { useAppStore, getEstimatedDistance, isWorkerOnline } from '../store';

const CATEGORIES = ['Todos','Eletricista','Encanador','Diarista','Pintor','Montador','TI','Freteiro'];
const CAT_ICONS  = {
  Todos: 'ph-squares-four',
  Eletricista: 'ph-lightning',
  Encanador: 'ph-drop',
  Diarista: 'ph-sparkle',
  Pintor: 'ph-paint-roller',
  Montador: 'ph-wrench',
  TI: 'ph-desktop',
  Freteiro: 'ph-truck'
};

export default function HomeContratante({ onSelectWorker }) {
  const { users, workerDetails, services, reviews, currentUser } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyOnline, setOnlyOnline] = useState(false);

  const myDetails = currentUser ? useAppStore.getState().contratanteDetails.find(d => d.user_id === currentUser.id) : null;
  const workers = users.filter(u => u.role === 'TRABALHADOR' && u.status === 'APPROVED');

  const filteredWorkers = workers.filter(w => {
    const d = workerDetails.find(x => x.user_id === w.id);
    const matchCat = selectedCategory === 'Todos' || d?.categorias?.some(c => c === selectedCategory);
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      w.nome.toLowerCase().includes(q) ||
      d?.categorias?.some(c => c.toLowerCase().includes(q)) ||
      d?.bio?.toLowerCase().includes(q) ||
      d?.bairro?.toLowerCase().includes(q) ||
      d?.cidade?.toLowerCase().includes(q);
    const matchOnline = !onlyOnline || isWorkerOnline(d);
    return matchCat && matchSearch && matchOnline;
  }).sort((a, b) => {
    if (!myDetails) return 0;
    const dA = workerDetails.find(x => x.user_id === a.id);
    const dB = workerDetails.find(x => x.user_id === b.id);
    const distA = parseFloat(getEstimatedDistance(myDetails, dA)) || Infinity;
    const distB = parseFloat(getEstimatedDistance(myDetails, dB)) || Infinity;
    return distA - distB;
  });

  return (
    <div className="w-full animate-fade-in">
      {/* ── HERO SECTION ── */}
      <section className="relative bg-white border-b border-slate-200/80 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-8 md:pt-12 md:pb-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-[#EA1D2C] text-xs font-semibold mb-4">
              <i className="ph-fill ph-seal-check text-sm" />
              <span>Encontre profissionais em Cáceres, MT</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-[2.65rem] font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Contrate profissionais de confiança <span className="text-[#EA1D2C]">em minutos.</span>
            </h1>
            <p className="text-sm md:text-base text-slate-500 font-medium mt-3 max-w-xl mx-auto">
              De reparos elétricos e hidráulicos a suporte técnico e mudanças. Compare avaliações, consulte preços base e agende direto pelo chat.
            </p>

            {/* Search Bar */}
            <div className="mt-6 md:mt-8 max-w-2xl mx-auto">
              <div className="relative flex items-center bg-white rounded-2xl border border-slate-200/90 shadow-[0_8px_30px_rgb(15,23,42,0.06)] focus-within:border-[#EA1D2C] focus-within:ring-4 focus-within:ring-red-500/10 transition-all p-1.5">
                <i className="ph-bold ph-magnifying-glass text-slate-400 text-lg ml-3.5 mr-2.5 shrink-0" />
                <input
                  aria-label="Buscar serviço ou profissional"
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Qual serviço ou profissional você procura?"
                  className="w-full py-2.5 pr-3 bg-transparent text-slate-900 placeholder:text-slate-400 font-medium text-sm md:text-base outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center mr-1 shrink-0 cursor-pointer"
                  >
                    <i className="ph-bold ph-x text-sm" />
                  </button>
                )}
                <button
                  type="button"
                  className="bg-[#EA1D2C] hover:bg-[#C81422] text-white font-semibold text-xs md:text-sm px-5 py-2.5 rounded-xl transition shrink-0 shadow-xs cursor-pointer"
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>

          {/* ── CATEGORIES RIBBON ── */}
          <div className="mt-8 md:mt-10">
            <div className="flex items-center gap-2 md:gap-3 overflow-x-auto hide-scrollbar pb-1 md:justify-center">
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs md:text-sm font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <i className={`${isSelected ? 'ph-fill text-[#EA1D2C]' : 'ph-bold text-slate-400'} ${CAT_ICONS[cat] || 'ph-squares-four'} text-base`} />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN LISTING SECTION ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10 mb-16">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
              {searchQuery
                ? `Resultados para "${searchQuery}"`
                : selectedCategory === 'Todos'
                ? 'Profissionais em Cáceres, MT'
                : `Especialistas em ${selectedCategory}`}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {filteredWorkers.length} {filteredWorkers.length === 1 ? 'profissional disponível' : 'profissionais encontrados'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setOnlyOnline(!onlyOnline)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                onlyOnline
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${onlyOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span>Disponíveis agora</span>
            </button>
          </div>
        </div>

        {/* Grid */}
        {filteredWorkers.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200/80 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <i className="ph-bold ph-magnifying-glass text-2xl" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Nenhum profissional encontrado</h3>
            <p className="text-xs text-slate-500 font-medium mb-5">Tente ajustar os filtros ou buscar por outro termo.</p>
            <button
              onClick={() => { setSelectedCategory('Todos'); setSearchQuery(''); setOnlyOnline(false); }}
              className="text-xs font-semibold text-[#EA1D2C] hover:underline cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkers.map(w => {
              const details = workerDetails.find(d => d.user_id === w.id);
              const workerReviews = reviews.filter(r => r.worker_id === w.id && !r.isWorkerReview);
              const dynamicRating = workerReviews.length > 0
                ? (workerReviews.reduce((a, b) => a + b.nota, 0) / workerReviews.length).toFixed(1)
                : 'Novo';
              const workerServices = services.filter(s => s.worker_id === w.id);
              const minPrice = workerServices.length > 0
                ? Math.min(...workerServices.map(s => Number(s.preco_base) || 0))
                : null;
              const online = isWorkerOnline(details);
              const dist = myDetails && details ? getEstimatedDistance(myDetails, details) : null;

              return (
                <button
                  type="button"
                  key={w.id}
                  onClick={() => onSelectWorker(w.id)}
                  className="card-pro text-left w-full rounded-2xl p-5 flex flex-col justify-between cursor-pointer hover:border-slate-300 hover:shadow-md transition-all duration-200 group"
                >
                  <div>
                    {/* Top Row: Avatar + Header Info */}
                    <div className="flex items-start gap-4">
                      <div className="relative shrink-0">
                        <img
                          src={w.foto_perfil_url}
                          alt={w.nome}
                          className="w-16 h-16 rounded-2xl object-cover bg-slate-100 border border-slate-200/60"
                        />
                        <span
                          title={online ? 'Disponível agora' : 'Fora do horário'}
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                            online ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EA1D2C] bg-red-50 px-2 py-0.5 rounded-md">
                            {details?.categorias?.[0] || 'Profissional'}
                          </span>
                          <div className="flex items-center gap-1 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-md shrink-0">
                            <i className="ph-fill ph-star text-amber-400 text-xs" />
                            <span className="text-xs font-bold text-slate-800">
                              {dynamicRating > 0 ? dynamicRating : 'Novo'}
                            </span>
                            {workerReviews.length > 0 && (
                              <span className="text-[10px] text-slate-400 font-medium">({workerReviews.length})</span>
                            )}
                          </div>
                        </div>

                        <h3 className="font-bold text-base text-slate-900 group-hover:text-[#EA1D2C] transition-colors truncate mt-1.5 flex items-center gap-1.5">
                          <span className="truncate">{w.nome}</span>
                          <i className="ph-fill ph-seal-check text-sky-500 text-sm shrink-0" title="Perfil aprovado na demonstração" />
                        </h3>

                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1 truncate">
                            <i className="ph-fill ph-map-pin text-slate-400" />
                            {details?.cidade ? `${details.cidade}, ${details.uf}` : details?.bairro ? `${details.bairro}, ${details.uf}` : 'Brasil'}
                          </span>
                          {dist && (
                            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              ~{dist} km
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bio snippet */}
                    {details?.bio && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-3.5 leading-relaxed">
                        {details.bio}
                      </p>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {minPrice ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] font-medium text-slate-400 uppercase">A partir de</span>
                          <span className="text-sm font-extrabold text-slate-900">R$ {minPrice}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Orçamento sob consulta</span>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#EA1D2C] group-hover:translate-x-0.5 transition-transform">
                      <span>Ver perfil</span>
                      <i className="ph-bold ph-caret-right text-xs" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
