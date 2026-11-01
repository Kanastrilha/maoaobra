// src/App.jsx — Router completo
import { useState, useEffect } from 'react';
import { useAppStore } from './store';

import Toast from './components/ui/Toast';
import NavBar from './components/layout/NavBar';
import SupportWidget from './components/layout/SupportWidget';
import PrivacyModal from './components/modals/PrivacyModal';

import LoginScreen from './pages/LoginScreen';
import RegisterScreen from './pages/RegisterScreen';
import HomeContratante from './pages/HomeContratante';
import WorkerProfileDetail from './pages/WorkerProfileDetail';
import ClientOrders from './pages/ClientOrders';
import ProfileUser from './pages/ProfileUser';
import ClientProfileDetail from './pages/ClientProfileDetail';

import WorkerDashboard from './pages/WorkerDashboard';
import WorkerServicesCRUD from './pages/WorkerServicesCRUD';
import WorkerHistory from './pages/WorkerHistory';
import WorkerProfileEdit from './pages/WorkerProfileEdit';

import AdminDashboard from './pages/AdminDashboard';
import { AdminClients, AdminWorkers, AdminApprovals, AdminSupport, AdminChats } from './pages/AdminPages';
import ActiveChats from './pages/ActiveChats';

function AppRouter() {
  const {
    currentView, currentUser,
    selectedWorkerId, setSelectedWorkerId,
    selectedClientId, setSelectedClientId,
    isLoaded, initFirebase
  } = useAppStore();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    initFirebase();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => console.log('Location granted:', pos.coords.latitude, pos.coords.longitude),
        (err) => console.log('Location denied/error:', err)
      );
    }
  }, [initFirebase]);

  // History API
  useEffect(() => {
    const handler = (e) => {
      if (e.state) {
        useAppStore.setState({
          currentView: e.state.view || 'HOME',
          selectedWorkerId: e.state.workerId || null,
          selectedClientId: e.state.clientId || null,
        });
      }
    };
    window.addEventListener('popstate', handler);
    window.history.replaceState({ view: currentView, workerId: null, clientId: null }, '', window.location.pathname);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // Inactivity Timeout
  useEffect(() => {
    let timeout;
    const resetTimer = () => {
      if (currentUser) {
        localStorage.setItem('maos_lastActivity', Date.now().toString());
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          useAppStore.getState().logout();
          useAppStore.getState().showToast('Sessão expirada por inatividade (30 min)', 'warning');
        }, 30 * 60 * 1000);
      }
    };

    if (currentUser) {
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
  }, [currentUser]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-white shadow-lg border border-slate-100 flex items-center justify-center mb-5 relative">
          <div className="w-10 h-10 border-[3px] border-[#EA1D2C] border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-xl font-extrabold tracking-tight text-slate-900">
          mão<span className="text-[#EA1D2C]">A</span>obra
        </div>
        <p className="text-xs font-medium text-slate-400 mt-1.5">Sincronizando coleções seguras em tempo real...</p>
      </div>
    );
  }

  const hideNav = currentView === 'LOGIN' || currentView === 'REGISTER' || !!selectedWorkerId;
  const navPaddingClass = !hideNav ? (!currentUser ? 'pt-18' : 'pt-16 md:pt-18') : '';
  const footerPadding = (!currentUser || hideNav) ? 'pb-8' : 'pb-24 md:pb-8';

  let content;
  if (currentView === 'LOGIN')                content = <LoginScreen />;
  else if (currentView === 'REGISTER')        content = <RegisterScreen />;
  else if (selectedWorkerId)                  content = <WorkerProfileDetail workerId={selectedWorkerId} onBack={() => setSelectedWorkerId(null)} />;
  else if (selectedClientId)                  content = <ClientProfileDetail clientId={selectedClientId} onBack={() => setSelectedClientId(null)} />;
  else if (currentView === 'HOME')            content = <HomeContratante onSelectWorker={setSelectedWorkerId} />;
  else if (currentView === 'CHATS')           content = <ActiveChats />;
  else if (currentView === 'ORDERS')          content = <ClientOrders />;
  else if (currentView === 'PROFILE')         content = <ProfileUser />;
  else if (currentView === 'WORKER_DASH')     content = <WorkerDashboard />;
  else if (currentView === 'WORKER_SERVICES') content = <WorkerServicesCRUD />;
  else if (currentView === 'WORKER_HISTORY')  content = <WorkerHistory />;
  else if (currentView === 'WORKER_PROFILE')  content = <WorkerProfileEdit />;
  else if (currentView === 'ADMIN_DASH')      content = <AdminDashboard />;
  else if (currentView === 'ADMIN_CLIENTS')   content = <AdminClients />;
  else if (currentView === 'ADMIN_WORKERS')   content = <AdminWorkers />;
  else if (currentView === 'ADMIN_APPROVALS') content = <AdminApprovals />;
  else if (currentView === 'ADMIN_SUPPORT')   content = <AdminSupport />;
  else if (currentView === 'ADMIN_CHATS')     content = <AdminChats />;
  else                                        content = <HomeContratante onSelectWorker={setSelectedWorkerId} />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans relative selection:bg-red-100 selection:text-[#EA1D2C]">
      <Toast />
      {!hideNav && <NavBar />}

      <main className={`flex-1 w-full relative z-10 ${navPaddingClass}`}>
        {content}
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
                <i className="ph-fill ph-shield-check text-emerald-500 text-sm" /> Profissionais Verificados
              </span>
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="flex items-center gap-1.5 hover:text-[#EA1D2C] transition cursor-pointer"
              >
                <i className="ph-fill ph-lock-key text-slate-400 text-sm" /> Política de Privacidade & LGPD
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
