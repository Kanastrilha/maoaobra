// src/pages/RegisterScreen.jsx
import { useState } from 'react';
import { useAppStore } from '../store';
import { formatCPF, formatPhone, isValidCPF } from '../utils/security';
import PrivacyModal from '../components/modals/PrivacyModal';

const UF_OPTIONS = ['SP','RJ','MG','RS','BA','PR','SC','GO','ES','DF','AM','PA','CE','PE','MT','MS','RN','AL','PB','PI','SE','TO','MA','AC','RO','RR','AP'];

export default function RegisterScreen() {
  const { register, setCurrentView, showToast } = useAppStore();
  const [role, setRole] = useState('CONTRATANTE');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [uf, setUf] = useState('SP');
  const [cidade, setCidade] = useState('');
  const [rua, setRua] = useState('');
  const [bairro, setBairro] = useState('');
  const [numero, setNumero] = useState('');
  const [bio, setBio] = useState('');
  const [categoria, setCategoria] = useState('Eletricista');
  const [lgpd, setLgpd] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const inp = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-3 focus:ring-red-500/15 focus:border-[#EA1D2C] outline-none bg-slate-50/60 focus:bg-white transition text-sm font-medium text-slate-900 placeholder:text-slate-400";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidCPF(cpf)) {
      showToast('CPF inválido. Verifique os dígitos informados.', 'error');
      return;
    }
    if (senha.length < 8) {
      showToast('Por segurança, a senha deve ter no mínimo 8 caracteres.', 'warning');
      return;
    }
    if (!lgpd) {
      showToast('Você precisa aceitar a informação sobre os dados locais.', 'error');
      return;
    }

    setSubmitting(true);
    try {
    const userData = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      senha,
      telefone,
      role,
      foto_perfil_url: ``
    };
    const specificData = { cpf, cep, uf, cidade, rua, bairro, numero };
    if (role === 'CONTRATANTE') await register(userData, { ...specificData, bio_curta: '' });
    else await register(userData, { ...specificData, bio, categorias: [categoria] });
    } finally { setSubmitting(false); }
  };

  const handleCepChange = async (e) => {
    let val = e.target.value.replace(/\D/g, '');
    setCep(val);
    if (val.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${val}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setRua(data.logradouro || '');
          setBairro(data.bairro || '');
          setCidade(data.localidade || '');
          setUf(data.uf || 'SP');
        }
      } catch (err) {
        console.error('Erro ao buscar CEP', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentView('LOGIN')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs transition cursor-pointer"
          >
            <i className="ph-bold ph-arrow-left" /> Voltar ao Login
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EA1D2C] flex items-center justify-center text-white">
              <i className="ph-bold ph-wrench text-xs" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              mão<span className="text-[#EA1D2C]">A</span>obra
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Criar nova conta</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Escolha seu perfil de uso e preencha seus dados para a demonstração local.
          </p>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole('CONTRATANTE')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              role === 'CONTRATANTE'
                ? 'bg-white border-[#EA1D2C] ring-3 ring-red-500/10 shadow-xs'
                : 'bg-white/70 border-slate-200/80 hover:bg-white text-slate-600'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              role === 'CONTRATANTE' ? 'bg-[#EA1D2C] text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              <i className="ph-fill ph-user text-lg" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">Quero Contratar</div>
              <div className="text-xs text-slate-500 mt-0.5">Busco profissionais para serviços e reparos</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setRole('TRABALHADOR')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              role === 'TRABALHADOR'
                ? 'bg-white border-[#EA1D2C] ring-3 ring-red-500/10 shadow-xs'
                : 'bg-white/70 border-slate-200/80 hover:bg-white text-slate-600'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              role === 'TRABALHADOR' ? 'bg-[#EA1D2C] text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              <i className="ph-fill ph-hard-hat text-lg" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">Quero Trabalhar</div>
              <div className="text-xs text-slate-500 mt-0.5">Sou prestador e quero oferecer meus serviços</div>
            </div>
          </button>
        </div>

        {role === 'TRABALHADOR' && (
          <div className="bg-amber-50/90 border border-amber-200/80 p-4 rounded-2xl mb-6 flex gap-3.5 items-start animate-fade-in">
            <i className="ph-fill ph-shield-check text-amber-600 text-xl shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider">Análise do perfil</h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Para manter a qualidade e confiança da plataforma, novos perfis profissionais passam por verificação dos dígitos do CPF e aprovação da administração antes de ficarem visíveis nas buscas.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dados Pessoais */}
          <Card step="01" title="Identificação Pessoal">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Nome Completo</Label>
                <input required type="text" maxLength="100" value={nome} onChange={e => setNome(e.target.value)} className={inp} placeholder="Ex: Maria Aparecida Silva" />
              </div>
              <div>
                <Label>CPF (verificação dos dígitos)</Label>
                <input required type="text" maxLength="14" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} className={inp} placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>WhatsApp (com DDD)</Label>
                <input required type="tel" maxLength="15" value={telefone} onChange={e => setTelefone(formatPhone(e.target.value))} className={inp} placeholder="(11) 90000-0000" />
              </div>
            </div>
          </Card>

          {/* Acesso */}
          <Card step="02" title="Credenciais de Acesso">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>E-mail</Label>
                <input required type="email" maxLength="100" value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="nome@email.com" />
              </div>
              <div>
                <Label>Senha Segura (mín. 8 caracteres)</Label>
                <input required type="password" minLength={8} maxLength="50" value={senha} onChange={e => setSenha(e.target.value)} className={inp} placeholder="••••••••" />
              </div>
            </div>
          </Card>

          {/* Endereço */}
          <Card step="03" title="Localização & Geolocalização">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>CEP (preenchimento automático)</Label>
                <input required type="text" maxLength="8" value={cep} onChange={handleCepChange} className={inp} placeholder="00000000" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>UF</Label>
                  <select required value={uf} onChange={e => setUf(e.target.value)} className={inp}>
                    {UF_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <Label>Cidade</Label>
                  <input required type="text" maxLength="100" value={cidade} onChange={e => setCidade(e.target.value)} className={inp} placeholder="Sua cidade" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Logradouro (Rua / Avenida)</Label>
                <input required type="text" maxLength="100" value={rua} onChange={e => setRua(e.target.value)} className={inp} placeholder="Ex: Av. Paulista" />
              </div>
              <div>
                <Label>Bairro</Label>
                <input required type="text" maxLength="50" value={bairro} onChange={e => setBairro(e.target.value)} className={inp} placeholder="Centro" />
              </div>
              <div>
                <Label>Número / Complemento</Label>
                <input required type="text" maxLength="20" value={numero} onChange={e => setNumero(e.target.value)} className={inp} placeholder="123 - Sala 4" />
              </div>
            </div>
          </Card>

          {/* Profissional */}
          {role === 'TRABALHADOR' && (
            <Card step="04" title="Qualificação Profissional">
              <div className="space-y-4">
                <div>
                  <Label>Categoria Principal de Atuação</Label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inp}>
                    {['Eletricista','Encanador','Diarista','Pintor','Montador','TI','Freteiro'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Apresentação Profissional (Bio)</Label>
                  <textarea
                    required
                    rows="4"
                    maxLength="500"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className={inp + ' resize-none'}
                    placeholder="Descreva sua experiência, certificações e principais serviços prestados..."
                  />
                  <p className="text-[11px] text-slate-400 mt-1 text-right">{bio.length}/500 caracteres</p>
                </div>
              </div>
            </Card>
          )}

          {/* LGPD */}
          <div className="card-pro p-4 rounded-2xl flex items-start gap-3">
            <input
              type="checkbox"
              id="lgpd"
              checked={lgpd}
              onChange={e => setLgpd(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#EA1D2C] cursor-pointer shrink-0"
            />
            <label htmlFor="lgpd" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
              Li e compreendi os{' '}
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                className="font-bold text-[#EA1D2C] hover:underline cursor-pointer"
              >
                informações sobre os dados locais
              </button>
              . Não informe dados pessoais reais nesta demonstração.
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#EA1D2C] hover:bg-[#C81422] disabled:opacity-60 text-white font-semibold text-sm py-3.5 rounded-xl shadow-sm shadow-red-500/20 transition cursor-pointer"
          >
            {submitting
              ? 'Registrando...'
              : role === 'CONTRATANTE'
              ? 'Finalizar Cadastro de Cliente'
              : 'Submeter Cadastro Profissional'}
          </button>
        </form>
      </div>

      {showPrivacyModal && <PrivacyModal onClose={() => setShowPrivacyModal(false)} />}
    </div>
  );
}

const Card = ({ step, title, children }) => (
  <div className="card-pro p-5 sm:p-6 rounded-2xl">
    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 mb-4">
      <span className="text-xs font-extrabold text-[#EA1D2C] bg-red-50 px-2 py-0.5 rounded-md">{step}</span>
      <h3 className="font-bold text-slate-900 text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);

const Label = ({ children }) => <label className="block text-xs font-semibold text-slate-700 mb-1.5">{children}</label>;
