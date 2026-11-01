// src/pages/ClientProfileDetail.jsx
import { useState } from 'react';
import { useAppStore } from '../store';
import Header from '../components/ui/Header';
import ReviewModal from '../components/modals/ReviewModal';
import StarRating from '../components/ui/StarRating';

export default function ClientProfileDetail({ clientId, onBack }) {
  const { users, contratanteDetails, reviews, orders, currentUser, submitReview } = useAppStore();
  const client = users.find(u => u.id === clientId);
  const details = contratanteDetails.find(d => d.user_id === clientId);
  const [showReviewModal, setShowReviewModal] = useState(false);

  if (!client || !currentUser) return null;

  const clientReviews = reviews.filter(r => r.user_id === clientId && r.isWorkerReview === true);
  const notaMedia = clientReviews.length > 0 ? (clientReviews.reduce((a, b) => a + b.nota, 0) / clientReviews.length).toFixed(1) : 0;
  const myFinishedOrders = orders.filter(o => o.worker_id === currentUser.id && o.contratante_id === clientId && o.status === 'CONCLUIDO');
  const canReview = myFinishedOrders.length > 0 && clientReviews.filter(r => r.worker_id === currentUser.id).length < myFinishedOrders.length;

  return (
    <div className="pb-24 animate-fade-in w-full">
      <Header title="Perfil do Cliente" showBack onBack={onBack} />
      <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-6">
        <div className="card-pro rounded-2xl overflow-hidden">
          <div className="h-28 bg-slate-900 relative">
            <img
              src={details?.banner_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=60'}
              className="w-full h-full object-cover opacity-40"
              alt="Capa"
            />
          </div>
          <div className="p-6 flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-12 relative">
            <img
              src={client.foto_perfil_url}
              className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white shrink-0"
              alt={client.nome}
            />
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-extrabold text-slate-900">{client.nome}</h2>
              <div className="inline-flex items-center gap-1.5 mt-1.5 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60">
                <i className="ph-fill ph-star text-amber-400 text-xs" />
                <span className="font-bold text-xs text-slate-800">{notaMedia > 0 ? notaMedia : 'Novo cliente'}</span>
              </div>
            </div>
            {canReview && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="w-full sm:w-auto bg-[#EA1D2C] hover:bg-[#C81422] text-white font-semibold text-xs py-2.5 px-4 rounded-xl transition cursor-pointer"
              >
                <i className="ph-bold ph-star mr-1.5" /> Avaliar Cliente
              </button>
            )}
          </div>
        </div>

        <div className="card-pro rounded-2xl p-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
            <i className="ph-fill ph-star text-[#EA1D2C] text-base" /> Histórico de Avaliações de Profissionais
          </h3>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {clientReviews.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <i className="ph-fill ph-star text-3xl text-slate-300 mb-1.5" />
                <p className="text-xs text-slate-500">Nenhuma avaliação registrada até o momento.</p>
              </div>
            ) : clientReviews.map(r => {
              const w = users.find(u => u.id === r.worker_id);
              return (
                <div key={r.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-xs text-slate-900">{w?.nome || 'Profissional'}</span>
                    <StarRating rating={r.nota} />
                  </div>
                  <p className="text-xs text-slate-600">{r.comentario}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {showReviewModal && (
        <ReviewModal
          isWorkerReview
          onSubmit={async (nota, comentario) => {
            const order = myFinishedOrders.find(o => !clientReviews.some(r => r.order_id === o.id && r.worker_id === currentUser.id));
            if (order && await submitReview({ order_id: order.id, nota, comentario })) setShowReviewModal(false);
          }}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
}
