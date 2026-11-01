// src/pages/WorkerServicesCRUD.jsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../store';
import Header from '../components/ui/Header';
import ImageUploader from '../components/ui/ImageUploader';

export default function WorkerServicesCRUD() {
  const { services, currentUser, saveService: persistService, deleteService: removeService, showToast } = useAppStore();
  const myServices = services.filter(s => s.worker_id === currentUser.id);
  const [modalData, setModalData] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);

  const openModal = (srv = null) => {
    setModalData(srv || { id: crypto.randomUUID(), worker_id: currentUser.id, titulo: '', preco_base: '', descricao: '', imagem_url: '' });
  };
  const closeModal = () => setModalData(null);

  const saveService = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const srvData = { ...modalData, titulo: fd.get('titulo'), descricao: fd.get('descricao'), preco_base: Number(fd.get('preco_base')), imagem_url: modalData.imagem_url };
    if (!await persistService(srvData)) return;
    showToast('Serviço salvo!');
    closeModal();
  };

  const deleteService = (id) => setServiceToDelete(id);
  const confirmDelete = async () => {
    if (serviceToDelete) {
      if (!await removeService(serviceToDelete)) return;
      setServiceToDelete(null);
    }
  };

  const inp = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-3 focus:ring-red-500/15 focus:border-[#EA1D2C] outline-none bg-slate-50/60 focus:bg-white transition text-sm font-medium";

  return (
    <div className="pb-24 animate-fade-in w-full">
      <Header
        title="Catálogo de Serviços"
        subtitle="Cadastre seus serviços e valores base para facilitar a contratação pelos clientes"
        rightContent={
          <button
            onClick={() => openModal()}
            className="bg-[#EA1D2C] hover:bg-[#C81422] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <i className="ph-bold ph-plus text-sm" />
            <span>Novo Serviço</span>
          </button>
        }
      />

      <div className="px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
        <button
          onClick={() => openModal()}
          className="w-full min-h-[200px] bg-white hover:bg-red-50/40 text-slate-600 hover:text-[#EA1D2C] border-2 border-slate-200 hover:border-[#EA1D2C]/50 border-dashed rounded-2xl p-6 font-semibold text-sm flex flex-col items-center justify-center gap-2.5 transition group cursor-pointer"
        >
          <div className="w-12 h-12 bg-slate-100 group-hover:bg-red-50 rounded-xl flex items-center justify-center transition-colors">
            <i className="ph-bold ph-plus text-xl" />
          </div>
          <span>Adicionar Serviço ao Catálogo</span>
        </button>

        {myServices.map(srv => (
          <div key={srv.id} className="card-pro rounded-2xl overflow-hidden flex flex-col group">
            <div className="relative h-36 bg-slate-100">
              {srv.imagem_url ? (
                <img src={srv.imagem_url} className="w-full h-full object-cover" alt={srv.titulo} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <i className="ph-fill ph-wrench text-4xl" />
                </div>
              )}
              <div className="absolute top-3 right-3 flex gap-1.5">
                <button
                  onClick={() => openModal(srv)}
                  className="w-8 h-8 bg-white/90 backdrop-blur-xs rounded-lg flex items-center justify-center text-slate-700 hover:bg-[#EA1D2C] hover:text-white transition shadow-xs cursor-pointer"
                  title="Editar"
                >
                  <i className="ph-bold ph-pencil-simple text-xs" />
                </button>
                <button
                  onClick={() => deleteService(srv.id)}
                  className="w-8 h-8 bg-white/90 backdrop-blur-xs rounded-lg flex items-center justify-center text-slate-700 hover:bg-red-600 hover:text-white transition shadow-xs cursor-pointer"
                  title="Excluir"
                >
                  <i className="ph-bold ph-trash text-xs" />
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-bold text-slate-900 text-base mb-1.5">{srv.titulo}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-1 line-clamp-3">{srv.descricao}</p>
              <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Preço Base</span>
                <span className="font-extrabold text-slate-900 text-lg">R$ {srv.preco_base}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalData && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-slide-down">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-base text-slate-900">
                {services.find(s => s.id === modalData.id) ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
              <button
                onClick={closeModal}
                className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <i className="ph-bold ph-x text-sm" />
              </button>
            </div>
            <form onSubmit={saveService} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Título do Serviço</label>
                <input required name="titulo" defaultValue={modalData.titulo} type="text" className={inp} placeholder="Ex: Instalação de Chuveiro Elétrico" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descrição detalhada</label>
                <textarea required name="descricao" defaultValue={modalData.descricao} rows="3" className={inp + ' resize-none'} placeholder="Explique o que está incluso no serviço..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Valor Base (R$)</label>
                  <input required name="preco_base" defaultValue={modalData.preco_base} type="number" min="1" step="0.01" className={inp} placeholder="100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Foto ilustrativa</label>
                  <div className="flex gap-3 items-center">
                    {modalData.imagem_url && (
                      <div className="relative">
                        <img src={modalData.imagem_url} className="w-11 h-11 rounded-xl object-cover border border-slate-200" alt="preview" />
                        <button
                          type="button"
                          onClick={() => setModalData({ ...modalData, imagem_url: '' })}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] border border-white"
                        >
                          <i className="ph-bold ph-x" />
                        </button>
                      </div>
                    )}
                    <ImageUploader
                      pathFolder={`services/${currentUser.id}`}
                      onUploadSuccess={(url) => setModalData({ ...modalData, imagem_url: url })}
                      onError={(err) => showToast(err, 'error')}
                    >
                      <div className="h-11 px-3 rounded-xl bg-slate-50 flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#EA1D2C] hover:bg-red-50 transition border border-slate-200 border-dashed">
                        <i className="ph-bold ph-upload-simple text-sm" />
                        <span>Enviar</span>
                      </div>
                    </ImageUploader>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#EA1D2C] hover:bg-[#C81422] text-white font-semibold text-sm py-3 rounded-xl shadow-xs transition mt-2 cursor-pointer"
              >
                Salvar Serviço
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {serviceToDelete && createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 text-center animate-slide-down border border-slate-200/80">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-red-600">
              <i className="ph-fill ph-trash text-2xl" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Remover serviço?</h3>
            <p className="text-xs text-slate-500 mb-5">Este item deixará de ser exibido em seu perfil público.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setServiceToDelete(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 transition cursor-pointer">
                Cancelar
              </button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 text-white font-semibold text-xs rounded-xl hover:bg-red-700 transition cursor-pointer">
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
