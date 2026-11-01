// src/pages/LoginScreen.jsx
import { useState } from 'react';
import { useAppStore } from '../store';
import { DATA_MODE } from '../firebase.js';

const DEMO_PASSWORD = DATA_MODE === 'local' ? '123' : 'TesteLocal@123';

const DEMO_ACCOUNTS = [
  { label: 'Cliente', email: 'pedro@example.test', icon: 'ph-user', desc: 'Contratar serviços' },
  { label: 'Profissional', email: 'eduardo@example.test', icon: 'ph-hard-hat', desc: 'Eletricista (Eduardo)' },
  { label: 'Administrador', email: 'legalmano@example.test', icon: 'ph-shield-check', desc: 'Gestão da plataforma' },
];

export default function LoginScreen() {
  const { login, setCurrentView, resetPassword, sendVerification } = useAppStore();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try { await login(email, senha); } finally { setSubmitting(false); }
  };

  const handleQuickLogin = async (demoEmail) => {
    if (submitting) return;
    setEmail(demoEmail);
    setSenha(DEMO_PASSWORD);
    setSubmitting(true);
    try { await login(demoEmail, DEMO_PASSWORD); } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row animate-fade-in">
      {/* ── Left Column: Brand Showcase (Desktop) ── */}
      <div className="hidden lg:flex lg:w-5/12 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#EA1D2C]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <button
            onClick={() => setCurrentView('HOME')}
            className="inline-flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#EA1D2C] flex items-center justify-center text-white shadow-md shadow-red-500/30">
              <i className="ph-bold ph-wrench text-xl" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight">
              mão<span className="text-[#EA1D2C]">A</span>obra
            </span>
          </button>
        </div>

        <div className="relative z-10 my-auto py-12">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#EA1D2C] bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full mb-5">
            Plataforma de Serviços
          </span>
          <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight">
            Conectando quem precisa a quem sabe fazer.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mt-4 max-w-md">
            Gerencie solicitações, negocie orçamentos pelo chat integrado e contrate especialistas avaliados pela comunidade nesta demonstração local.
          </p>

          <div className="mt-8 space-y-3.5">
            {[
              { icon: 'ph-seal-check', text: 'Aprovação simulada de profissionais' },
              { icon: 'ph-chat-circle-dots', text: 'Orçamentos formais e chat em tempo real' },
              { icon: 'ph-clock', text: 'Disponibilidade inteligente por horário de expediente' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-xs font-medium text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#EA1D2C] shrink-0">
                  <i className={`ph-fill ${item.icon} text-sm`} />
                </div>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 font-medium">
          © 2026 mãoAobra Tecnologia • Demonstração local
        </div>
      </div>

      {/* ── Right Column: Form ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 relative">
        <div className="w-full max-w-md">
          <button
            onClick={() => setCurrentView('HOME')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-6 px-3 py-2 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
          >
            <i className="ph-bold ph-arrow-left" /> Voltar para a página inicial
          </button>

          <div className="card-pro rounded-2xl p-6 sm:p-8">
            <div className="mb-6">
              <div className="lg:hidden flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#EA1D2C] flex items-center justify-center text-white">
                  <i className="ph-bold ph-wrench text-base" />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  mão<span className="text-[#EA1D2C]">A</span>obra
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Acesse sua conta</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Informe suas credenciais para continuar na plataforma.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">E-mail</label>
                <div className="relative">
                  <i className="ph-bold ph-envelope-simple absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-3 focus:ring-red-500/15 focus:border-[#EA1D2C] outline-none transition text-sm bg-slate-50/60 focus:bg-white font-medium"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Senha</label>
                <div className="relative">
                  <i className="ph-bold ph-lock-key absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                  <input
                    type="password"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-3 focus:ring-red-500/15 focus:border-[#EA1D2C] outline-none transition text-sm bg-slate-50/60 focus:bg-white font-medium"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#EA1D2C] hover:bg-[#C81422] text-white font-semibold text-sm py-3 rounded-xl shadow-sm shadow-red-500/20 transition cursor-pointer mt-2"
              >
                {submitting ? 'Entrando...' : 'Entrar na Plataforma'}
              </button>
            </form>

            {DATA_MODE !== 'local' && <div className="mt-3 flex justify-between gap-3 text-xs text-slate-500">
              <button type="button" disabled={submitting || !email} onClick={async () => { setSubmitting(true); try { await resetPassword(email); } finally { setSubmitting(false); } }} className="hover:text-[#EA1D2C]">Esqueci minha senha</button>
              <button type="button" disabled={submitting || !email || !senha} onClick={async () => { setSubmitting(true); try { await sendVerification(email, senha); } finally { setSubmitting(false); } }} className="hover:text-[#EA1D2C]">Reenviar confirmação</button>
            </div>}

            {/* Quick Demo Logins */}
            {DATA_MODE !== 'firebase' && <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Contas fictícias para testar
                </span>
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Senha: {DEMO_PASSWORD}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickLogin(acc.email)}
                    className="flex flex-col items-center text-center p-2.5 rounded-xl border border-slate-200/80 hover:border-[#EA1D2C] hover:bg-red-50/40 transition group cursor-pointer"
                  >
                    <i className={`ph-fill ${acc.icon} text-lg text-slate-400 group-hover:text-[#EA1D2C] mb-1 transition-colors`} />
                    <span className="text-xs font-bold text-slate-800">{acc.label}</span>
                    <span className="text-[10px] text-slate-400 truncate w-full mt-0.5">{acc.desc}</span>
                  </button>
                ))}
              </div>
            </div>}

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium">
                Ainda não possui uma conta?{' '}
                <button
                  onClick={() => setCurrentView('REGISTER')}
                  className="font-bold text-[#EA1D2C] hover:underline cursor-pointer"
                >
                  Criar conta gratuita
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
