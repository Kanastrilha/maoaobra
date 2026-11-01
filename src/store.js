import { create } from 'zustand';
import { initializeLocalDatabase, subscribeLocal, loginLocal, registerLocal, logoutLocal, commitLocal, getLocalSnapshot, touchLocalSession, resetPassword, sendVerification } from './data/provider.js';
import { DATA_MODE } from './firebase.js';
import { makeId } from './data/domain.js';
import { calculateHaversineDistance } from './utils/security.js';
import { isWorkerOnline } from './data/availability.js';
export { isWorkerOnline };

export const getEstimatedDistance = (client, worker) => {
  if (![client?.lat, client?.lng, worker?.lat, worker?.lng].every(Number.isFinite)) return null;
  return calculateHaversineDistance(client.lat, client.lng, worker.lat, worker.lng);
};

export function canAccessView(view, user) {
  if (['HOME', 'LOGIN', 'REGISTER'].includes(view)) return true;
  if (!user) return false;
  if (view.startsWith('ADMIN_')) return user.role === 'ADMIN';
  if (view.startsWith('WORKER_')) return user.role === 'TRABALHADOR';
  if (['ORDERS', 'PROFILE'].includes(view)) return user.role === 'CONTRATANTE';
  return view === 'CHATS';
}

const landing = user => user?.role === 'ADMIN' ? 'ADMIN_DASH' : user?.role === 'TRABALHADOR' ? 'WORKER_DASH' : 'HOME';
const navigate = (view, workerId = null, clientId = null) => {
  const url = new URL(window.location.href);
  if (workerId) url.searchParams.set('profissional', workerId);
  else url.searchParams.delete('profissional');
  window.history.pushState({ view, workerId, clientId }, '', url);
};

export const useAppStore = create((set, get) => {
  const refresh = async () => { const snapshot = await getLocalSnapshot(); set(snapshot); return snapshot; };
  const run = async (command, successMessage) => {
    try {
      await commitLocal(command);
      await refresh();
      if (successMessage) get().showToast(successMessage);
      return true;
    } catch (error) {
      get().showToast(error.message || 'Não foi possível salvar. Tente novamente.', 'error');
      return false;
    }
  };
  const patch = async (entity, next) => {
    const previous = get()[entity];
    const records = typeof next === 'function' ? next(previous) : next;
    const key = ['workerDetails', 'contratanteDetails'].includes(entity) ? 'user_id' : 'id';
    const changes = [];
    for (const record of records) {
      const before = previous.find(item => item[key] === record[key]);
      if (!before) { get().showToast('Use a ação de cadastro para criar um registro.', 'error'); return false; }
      const fields = Object.fromEntries(Object.entries(record).filter(([field, value]) => field !== key && JSON.stringify(before[field]) !== JSON.stringify(value)));
      if (Object.keys(fields).length) changes.push({ id: record[key], patch: fields });
    }
    if (records.length !== previous.length) { get().showToast('Use a ação de exclusão para remover um registro.', 'error'); return false; }
    return !changes.length || run({ type: 'patch', entity, changes });
  };
  return {
    isLoaded: false, loadError: null,
    users: [], workerDetails: [], contratanteDetails: [], services: [], orders: [], reviews: [], supportTickets: [],
    currentUser: null, currentView: 'HOME', selectedWorkerId: null, selectedClientId: null, toast: null,
    setUsers: next => patch('users', next),
    setWorkerDetails: next => patch('workerDetails', next),
    setContratanteDetails: next => patch('contratanteDetails', next),
    showToast: (message, type = 'success') => {
      const id = makeId(); set({ toast: { message, type, id } });
      setTimeout(() => { if (get().toast?.id === id) set({ toast: null }); }, 5000);
    },
    setCurrentView: view => {
      const allowed = canAccessView(view, get().currentUser) ? view : get().currentUser ? landing(get().currentUser) : 'LOGIN';
      set({ currentView: allowed, selectedWorkerId: null, selectedClientId: null }); navigate(allowed);
    },
    restoreNavigation: state => {
      const user = get().currentUser;
      const view = state?.view || 'HOME';
      const workerId = state?.workerId || new URL(window.location.href).searchParams.get('profissional');
      const clientId = user && state?.clientId;
      const allowedClient = clientId && (user.role === 'ADMIN' || get().orders.some(o => o.worker_id === user.id && o.contratante_id === clientId));
      set({ currentView: canAccessView(view, user) ? view : landing(user), selectedWorkerId: workerId || null, selectedClientId: allowedClient ? clientId : null });
    },
    setSelectedWorkerId: id => { set({ selectedWorkerId: id, selectedClientId: null }); navigate(get().currentView, id); },
    setSelectedClientId: id => {
      const user = get().currentUser;
      if (id && (!user || (user.role !== 'ADMIN' && !get().orders.some(o => o.worker_id === user.id && o.contratante_id === id)))) return;
      set({ selectedClientId: id, selectedWorkerId: null }); navigate(get().currentView, null, id);
    },
    login: async (email, password) => {
      try {
        const user = await loginLocal(email, password); await refresh(); get().setCurrentView(landing(user));
        get().showToast(`Bem-vindo, ${user.nome.split(' ')[0]}!`); return true;
      } catch (error) { get().showToast(error.message, 'error'); return false; }
    },
    logout: async () => {
      try { await logoutLocal(); await refresh(); get().setCurrentView('HOME'); get().showToast('Sessão encerrada.'); }
      catch { get().showToast('Não foi possível encerrar a sessão. Tente novamente.', 'error'); }
    },
    register: async (user, details) => {
      try {
        const created = await registerLocal(user, details); await refresh();
        get().setCurrentView(DATA_MODE === 'local' && created.role === 'CONTRATANTE' ? 'HOME' : 'LOGIN');
        get().showToast(DATA_MODE === 'local' ? (created.role === 'CONTRATANTE' ? 'Conta local criada com sucesso!' : 'Cadastro enviado para análise na demonstração.') : 'Conta criada. Confirme seu e-mail; profissionais também precisam de aprovação.'); return true;
      } catch (error) { get().showToast(error.message, 'error'); return false; }
    },
    resetPassword: async email => {
      try { await resetPassword(email); get().showToast(DATA_MODE === 'firebase' ? 'Se houver uma conta para este e-mail, você receberá as instruções de recuperação.' : 'Se houver uma conta para este e-mail, as instruções de recuperação estarão disponíveis no emulador.'); return true; }
      catch (error) { get().showToast(error.message, 'error'); return false; }
    },
    sendVerification: async (email, password) => {
      try { await sendVerification(email, password); get().showToast(DATA_MODE === 'firebase' ? 'Confira seu e-mail para confirmar o cadastro.' : 'Consulte o link de confirmação no emulador de autenticação.'); return true; }
      catch (error) { get().showToast(error.message, 'error'); return false; }
    },
    saveService: service => run({ type: 'saveService', service }),
    deleteService: id => run({ type: 'deleteService', id }, 'Serviço excluído.'),
    createOrder: data => run({ ...data, type: 'createOrder', id: makeId(), messageId: makeId() }, 'Solicitação enviada com sucesso!'),
    sendMessage: (orderId, message) => run({ type: 'sendMessage', orderId, message: { ...message, id: makeId() } }),
    changeOrderStatus: (orderId, status, price) => run({ type: 'changeStatus', orderId, status, price }),
    submitReview: data => run({ ...data, type: 'review' }, 'Avaliação enviada!'),
    sendTicketMessage: (ticketId, text) => run({ type: 'ticketMessage', ticketId: ticketId || makeId(), text, id: makeId() }),
    closeTicket: id => run({ type: 'closeTicket', id }, 'Chamado encerrado.'),
    approveWorker: id => run({ type: 'approveWorker', id }, 'Profissional aprovado.'),
    rejectWorker: id => run({ type: 'rejectWorker', id }, DATA_MODE === 'local' ? 'Cadastro recusado e removido.' : 'Cadastro recusado.'),
    deleteMyAccount: async () => {
      if (DATA_MODE !== 'local') { get().showToast('A exclusão no backend ainda não está habilitada nesta etapa.', 'warning'); return false; }
      if (!get().currentUser || !window.confirm('Excluir permanentemente sua conta e seus dados desta demonstração local?')) return false;
      const success = await run({ type: 'deleteAccount', id: get().currentUser.id });
      if (success) { await logoutLocal(); await refresh(); get().setCurrentView('HOME'); get().showToast('Conta e dados locais excluídos.'); }
      return success;
    },
    deleteUser: async id => {
      if (DATA_MODE !== 'local') { get().showToast('A exclusão no backend ainda não está habilitada nesta etapa.', 'warning'); return false; }
      if (!window.confirm('Excluir esta conta e todos os dados relacionados da demonstração local?')) return false;
      return run({ type: 'deleteAccount', id }, 'Conta e dados locais removidos.');
    },
    touchSession: async () => {
      try { await touchLocalSession(); } catch { await get().logout(); }
    },
    initialize: () => {
      let active = true, unsubscribe = () => {};
      set({ loadError: null });
      initializeLocalDatabase().then(() => {
        if (!active) return;
        unsubscribe = subscribeLocal(snapshot => {
          const previous = get().currentUser;
          const currentView = canAccessView(get().currentView, snapshot.currentUser) ? get().currentView : landing(snapshot.currentUser);
          set({ ...snapshot, isLoaded: true, loadError: null, currentView,
            ...(!snapshot.currentUser && previous ? { selectedClientId: null } : {}) });
          if (!previous && snapshot.currentUser && ['LOGIN', 'REGISTER'].includes(currentView)) get().setCurrentView(landing(snapshot.currentUser));
        }, error => set({ loadError: error.message, isLoaded: false }));
      }).catch(error => { if (active) set({ loadError: error.message, isLoaded: false }); });
      return () => { active = false; unsubscribe(); };
    },
  };
});
