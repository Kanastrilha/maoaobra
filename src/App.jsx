// src/App.jsx — Router completo
import { useState, useEffect, lazy, Suspense } from 'react';
import { useAppStore, canAccessView } from './store';
import { DATA_MODE } from './firebase.js';

import Toast from './components/ui/Toast';
import NavBar from './components/layout/NavBar';
import SupportWidget from './components/layout/SupportWidget';
import PrivacyModal from './components/modals/PrivacyModal';

const LoginScreen = lazy(() => import('./pages/LoginScreen'));
const RegisterScreen = lazy(() => import('./pages/RegisterScreen'));
import HomeContratante from './pages/HomeContratante';
const WorkerProfileDetail = lazy(() => import('./pages/WorkerProfileDetail'));
const ClientOrders = lazy(() => import('./pages/ClientOrders'));
const ProfileUser = lazy(() => import('./pages/ProfileUser'));
const ClientProfileDetail = lazy(() => import('./pages/ClientProfileDetail'));

const WorkerDashboard = lazy(() => import('./pages/WorkerDashboard'));
const WorkerServicesCRUD = lazy(() => import('./pages/WorkerServicesCRUD'));
const WorkerHistory = lazy(() => import('./pages/WorkerHistory'));
const WorkerProfileEdit = lazy(() => import('./pages/WorkerProfileEdit'));

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminClients = lazy(() => import('./pages/AdminPages').then(module => ({ default: module.AdminClients })));
const AdminWorkers = lazy(() => import('./pages/AdminPages').then(module => ({ default: module.AdminWorkers })));
const AdminApprovals = lazy(() => import('./pages/AdminPages').then(module => ({ default: module.AdminApprovals })));
const AdminSupport = lazy(() => import('./pages/AdminPages').then(module => ({ default: module.AdminSupport })));
const AdminChats = lazy(() => import('./pages/AdminPages').then(module => ({ default: module.AdminChats })));
const ActiveChats = lazy(() => import('./pages/ActiveChats'));

function AppRouter() {
  const {
    currentView, currentUser,
    selectedWorkerId, setSelectedWorkerId,
    selectedClientId, setSelectedClientId,
    isLoaded, loadError, initialize
  } = useAppStore();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => initialize(), [initialize]);

  // History API
  useEffect(() => {
    const handler = e => useAppStore.getState().restoreNavigation(e.state);
    useAppStore.getState().restoreNavigation(window.history.state);
    window.addEventListener('popstate', handler);
    window.history.replaceState({ view: useAppStore.getState().currentView, workerId: useAppStore.getState().selectedWorkerId, clientId: null }, '', window.location.pathname + window.location.search);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const currentUserId = currentUser?.id;

  // Inactivity Timeout
  useEffect(() => {
    let timeout;
    let lastTouch = 0;
    const resetTimer = () => {
      if (currentUserId) {
        if (Date.now() - lastTouch > 15_000) { lastTouch = Date.now(); void useAppStore.getState().touchSession(); }
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          useAppStore.getState().logout();
          useAppStore.getState().showToast('Sessão expirada por inatividade (30 min)', 'warning');
        }, 30 * 60 * 1000);
      }
    };

    if (currentUserId) {
      resetTimer();
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keypress', resetTimer);
      window.addEventListener('touchstart', resetTimer);
    }
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [currentUserId]);

  if (loadError) return (<div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div role="alert" className="max-w-md rounded-2xl bg-white border border-red-200 p-6"><h1 className="text-xl font-bold mb-3">Não foi possível abrir a cópia local</h1><p className="text-sm text-slate-600 mb-4">{loadError}</p><button onClick={() => window.location.reload()} className="rounded-xl bg-[#EA1D2C] text-white px-4 py-2">Tentar novamente</button></div></div>);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-lg border border-slate-100 flex items-center justify-center mb-5 relative">
          <div className="w-10 h-10 border-[3px] border-[#EA1D2C] border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-xl font-extrabold tracking-tight text-slate-900">
          mão<span className="text-[#EA1D2C]">A</span>obra
        </div>
        <p className="text-xs font-medium text-slate-400 mt-1.5">Abrindo sua demonstração local...</p>
      </div>
    );
  }

  const view = canAccessView(currentView, currentUser) ? currentView : 'HOME';
  const hideNav = currentView === 'LOGIN' || currentView === 'REGISTER' || !!selectedWorkerId;
  const navPaddingClass = !hideNav ? (!currentUser ? 'pt-18' : 'pt-16 md:pt-18') : '';
  const footerPadding = (!currentUser || hideNav) ? 'pb-8' : 'pb-24 md:pb-8';

  let content;
  if (view === 'LOGIN')                content = <LoginScreen />;
  else if (view === 'REGISTER')        content = <RegisterScreen />;
  else if (selectedWorkerId)                  content = <WorkerProfileDetail workerId={selectedWorkerId} onBack={() => setSelectedWorkerId(null)} />;
  else if (selectedClientId && currentUser)                  content = <ClientProfileDetail clientId={selectedClientId} onBack={() => setSelectedClientId(null)} />;
  else if (view === 'HOME')            content = <HomeContratante onSelectWorker={setSelectedWorkerId} />;
  else if (view === 'CHATS')           content = <ActiveChats />;
  else if (view === 'ORDERS')          content = <ClientOrders />;
  else if (view === 'PROFILE')         content = <ProfileUser />;
  else if (view === 'WORKER_DASH')     content = <WorkerDashboard />;
  else if (view === 'WORKER_SERVICES') content = <WorkerServicesCRUD />;
  else if (view === 'WORKER_HISTORY')  content = <WorkerHistory />;
  else if (view === 'WORKER_PROFILE')  content = <WorkerProfileEdit />;
  else if (view === 'ADMIN_DASH')      content = <AdminDashboard />;
  else if (view === 'ADMIN_CLIENTS')   content = <AdminClients />;
  else if (view === 'ADMIN_WORKERS')   content = <AdminWorkers />;
  else if (view === 'ADMIN_APPROVALS') content = <AdminApprovals />;
  else if (view === 'ADMIN_SUPPORT')   content = <AdminSupport />;
  else if (view === 'ADMIN_CHATS')     content = <AdminChats />;
  else                                        content = <HomeContratante onSelectWorker={setSelectedWorkerId} />;

  return (
    <div className="demo-mode min-h-screen pt-8 bg-[#F8FAFC] flex flex-col font-sans relative selection:bg-red-100 selection:text-[#EA1D2C]">
      <div className="fixed top-0 inset-x-0 z-[60] h-8 flex items-center justify-center bg-amber-100 text-amber-950 text-[11px] sm:text-xs font-semibold px-2">{DATA_MODE === 'local' ? 'Demonstração local · Dados salvos só neste navegador' : 'Teste de backend · Firebase emulado neste computador'}</div>
      <Toast />
      {!hideNav && <NavBar />}

      <main className={`flex-1 w-full relative z-10 ${navPaddingClass}`}>
        <Suspense fallback={<p className="p-8 text-center text-slate-500">Abrindo página...</p>}>{content}</Suspense>
      </main>

      <SupportWidget />
      {showPrivacyModal && <PrivacyModal onClose={() => setShowPrivacyModal(false)} />}

      {!hideNav && (
        <footer className={`bg-white border-t border-slate-200/80 py-8 px-4 md:px-8 relative z-10 ${footerPadding}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EA1D2C] text-white flex items-center justify-center shadow-sm shadow-red-500/20">
                <i className="ph-bold ph-wrench text-sm" />
              </div>
              <div>
                <div className="text-base font-extrabold tracking-tight leading-none">
                  <span className="text-slate-900">mão</span>
                  <span className="text-[#EA1D2C]">A</span>
                  <span className="text-slate-900">obra</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Marketplace de Serviços Profissionais</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <i className="ph-fill ph-shield-check text-emerald-500 text-sm" /> Perfis da demonstração
              </span>
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="flex items-center gap-1.5 hover:text-[#EA1D2C] transition cursor-pointer"
              >
                <i className="ph-fill ph-lock-key text-slate-400 text-sm" /> Sobre os dados locais
              </button>
              <span className="flex items-center gap-1.5">
                <i className="ph-fill ph-headset text-[#EA1D2C] text-sm" /> Suporte Integrado
              </span>
            </div>

            <div className="text-center md:text-right">
              <p className="text-xs text-slate-400 font-medium">© 2026 mãoAobra Tecnologia. Todos os direitos reservados.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return <AppRouter />;
}
