// src/components/modals/ReviewModal.jsx
import { useState } from 'react';
import { createPortal } from 'react-dom';

export default function ReviewModal({ onSubmit, onClose, isWorkerReview = false }) {
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl relative animate-slide-down border border-slate-200/80">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <i className="ph-fill ph-star text-lg" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Avaliar Experiência</h2>
              <p className="text-xs text-slate-500">
                {isWorkerReview ? 'Como foi atender este cliente?' : 'Como foi o serviço prestado?'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg flex items-center justify-center transition cursor-pointer"
          >
            <i className="ph-bold ph-x text-sm" />
          </button>
        </div>

        {/* Estrelas clicáveis */}
        <div className="bg-slate-50 rounded-xl p-4 mb-4 text-center border border-slate-100">
          <div className="flex justify-center gap-2 mb-1.5">
            {[1, 2, 3, 4, 5].map(i => (
              <button key={i} type="button" onClick={() => setNota(i)} className="cursor-pointer">
                <i className={`text-3xl transition-transform hover:scale-110 ${i <= nota ? 'ph-fill ph-star text-amber-400' : 'ph-fill ph-star text-slate-200'}`} />
              </button>
            ))}
          </div>
          <p className="text-xs font-bold text-slate-600">{['', 'Péssimo', 'Ruim', 'Regular', 'Muito Bom', 'Excelente!'][nota]}</p>
        </div>

        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Seu depoimento</label>
        <textarea
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          maxLength={400}
          placeholder={isWorkerReview ? 'Conte como foi trabalhar com este cliente...' : 'Conte como foi a pontualidade e qualidade do serviço...'}
          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-3 focus:ring-red-500/15 focus:border-[#EA1D2C] outline-none bg-slate-50/60 focus:bg-white text-sm resize-none h-24 transition"
        />
        <p className="text-[11px] text-slate-400 text-right mt-1 mb-4">{comentario.length}/400</p>

        <button
          onClick={() => { if (comentario.trim().length < 5) return; onSubmit(nota, comentario); }}
          disabled={comentario.trim().length < 5}
          className="w-full bg-[#EA1D2C] disabled:opacity-50 hover:bg-[#C81422] text-white font-semibold text-sm py-3 rounded-xl shadow-sm shadow-red-500/20 transition cursor-pointer"
        >
          Publicar Avaliação
        </button>
      </div>
    </div>,
    document.body
  );
}
