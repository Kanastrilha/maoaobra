// src/pages/ProfileUser.jsx
import { useAppStore } from '../store';
import { maskCPF } from '../utils/security';
import Header from '../components/ui/Header';
import ImageUploader from '../components/ui/ImageUploader';

export default function ProfileUser() {
  const { currentUser, contratanteDetails, logout, deleteMyAccount, users, setUsers, setContratanteDetails, showToast, setCurrentUser, setCurrentView } = useAppStore();

  if (!currentUser) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <i className="ph-fill ph-user-circle text-3xl" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Minha Conta</h2>
      <p className="text-xs text-slate-500 font-medium mb-5">Faça login para gerenciar suas informações cadastrais.</p>
      <button
        onClick={() => setCurrentView('LOGIN')}
        className="bg-[#EA1D2C] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[#C81422] transition cursor-pointer"
      >
        Fazer Login
      </button>
    </div>
  );

  const details = contratanteDetails.find(d => d.user_id === currentUser.id);

  return (
    <div className="pb-24 animate-fade-in w-full">
      <Header title="Minha Conta" subtitle="Gerencie seus dados de perfil, segurança e privacidade (LGPD)" />
      <div className="max-w-3xl mx-auto px-4 md:px-8 space-y-6">
        <div className="card-pro rounded-2xl overflow-hidden">
          <div className="h-32 bg-slate-900 relative">
            <img
              src={details?.banner_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=60'}
              className="w-full h-full object-cover opacity-40"
              alt="Capa"
            />
            <ImageUploader
              pathFolder={`users/${currentUser.id}/banner`}
              className="absolute top-3.5 right-3.5"
              onUploadSuccess={(url) => { setContratanteDetails(contratanteDetails.map(d => d.user_id === currentUser.id ? { ...d, banner_url: url } : d)); showToast('Capa atualizada!'); }}
              onError={(err) => showToast(err, 'error')}
            >
              <div role="button" className="bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-xl backdrop-blur-md transition border border-white/20 text-xs font-semibold flex gap-1.5 items-center cursor-pointer">
                <i className="ph-bold ph-camera" /> Alterar Capa
              </div>
            </ImageUploader>
          </div>

          <div className="p-6 flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 relative">
            <div className="relative">
              <img
                src={currentUser.foto_perfil_url}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
                alt={currentUser.nome}
              />
              <ImageUploader
                pathFolder={`users/${currentUser.id}/avatar`}
                className="absolute -bottom-1.5 -right-1.5"
                onUploadSuccess={(url) => { setUsers(users.map(u => u.id === currentUser.id ? { ...u, foto_perfil_url: url } : u)); setCurrentUser({ ...currentUser, foto_perfil_url: url }); showToast('Foto atualizada!'); }}
                onError={(err) => showToast(err, 'error')}
              >
                <div role="button" className="bg-[#EA1D2C] text-white w-8 h-8 flex items-center justify-center rounded-xl shadow-xs hover:bg-[#C81422] transition border-2 border-white cursor-pointer">
                  <i className="ph-bold ph-pencil-simple text-xs" />
                </div>
              </ImageUploader>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-extrabold text-slate-900">{currentUser.nome}</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{currentUser.email}</p>
            </div>
          </div>
        </div>

        <div className="card-pro rounded-2xl p-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <i className="ph-fill ph-identification-badge text-[#EA1D2C] text-base" /> Dados Cadastrais & Privacidade
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem label="Telefone / WhatsApp" value={currentUser.telefone} />
            <InfoItem label="CPF (Protegido pela LGPD)" value={maskCPF(details?.cpf)} />
            <div className="sm:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Endereço Cadastrado</div>
              <div className="text-sm font-bold text-slate-900">
                {details?.rua ? `${details.rua}, ${details.numero}` : 'Endereço não informado'}
              </div>
              {details?.bairro && (
                <div className="text-xs font-medium text-slate-500 mt-0.5">
                  {details.bairro} • {details.cidade ? `${details.cidade}/` : ''}{details.uf} • CEP: {details.cep}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={deleteMyAccount}
              className="w-full sm:w-auto text-xs font-semibold text-slate-400 hover:text-red-600 py-2 px-3 rounded-xl hover:bg-red-50 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <i className="ph-bold ph-trash text-sm" /> Excluir Minha Conta e Dados (LGPD)
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
  );
}

const InfoItem = ({ label, value }) => (
  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
    <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">{label}</div>
    <div className="text-sm font-bold text-slate-900">{value || '—'}</div>
  </div>
);
