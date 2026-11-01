import { isValidCPF } from '../utils/security.js';

export const SESSION_MS = 30 * 60 * 1000;
const CLOSED = ['CONCLUIDO', 'RECUSADO', 'CANCELADO'];
const FIELDS = {
  users: ['nome', 'telefone', 'foto_perfil_url'],
  workerDetails: ['bio', 'categorias', 'portfolio_fotos', 'banner_url', 'isOnline', 'horaInicio', 'horaFim', 'diasTrabalho', 'timeZone'],
  contratanteDetails: ['banner_url', 'bio_curta'],
  services: ['titulo', 'descricao', 'preco_base', 'imagem_url'],
};
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const idField = entity => ['workerDetails', 'contratanteDetails'].includes(entity) ? 'user_id' : 'id';
export const makeId = () => crypto.randomUUID();

export function resolveSession(state, token, now = Date.now()) {
  const session = state.sessions[token];
  if (!session || now - session.lastActivity >= SESSION_MS) return null;
  const user = state.users.find(u => u.id === session.userId && u.status === 'APPROVED');
  return user || null;
}

export function snapshotFor(state, token, now = Date.now()) {
  const currentUser = resolveSession(state, token, now);
  const admin = currentUser?.role === 'ADMIN';
  const orders = state.orders.filter(o => admin || o.worker_id === currentUser?.id || o.contratante_id === currentUser?.id);
  const peers = new Set(orders.flatMap(o => [o.worker_id, o.contratante_id]));
  const publicUser = ({ id, nome, role, status, foto_perfil_url, data_criacao, telefone }) => ({
    id, nome, role, status, foto_perfil_url, data_criacao,
    ...(role === 'TRABALHADOR' ? { telefone } : {}),
  });
  const users = state.users.filter(u => admin || u.id === currentUser?.id || peers.has(u.id) || (u.role === 'TRABALHADOR' && u.status === 'APPROVED'))
    .map(u => admin || u.id === currentUser?.id ? { ...u } : publicUser(u));
  return {
    currentUser: currentUser ? { ...currentUser } : null,
    users,
    workerDetails: state.workerDetails.filter(d => users.some(u => u.id === d.user_id)).map(d => {
      if (admin || d.user_id === currentUser?.id) return { ...d };
      const { user_id, bio, categorias, portfolio_fotos, banner_url, cidade, uf, isOnline, workingHours, horaInicio, horaFim, diasTrabalho, timeZone } = d;
      return { user_id, bio, categorias, portfolio_fotos, banner_url, cidade, uf, isOnline, workingHours, horaInicio, horaFim, diasTrabalho, timeZone };
    }),
    contratanteDetails: state.contratanteDetails.filter(d => admin || d.user_id === currentUser?.id),
    services: state.services.filter(s => state.users.some(u => u.id === s.worker_id && u.status === 'APPROVED')),
    orders,
    reviews: state.reviews,
    supportTickets: state.supportTickets.filter(t => admin || t.user_id === currentUser?.id),
  };
}

export function registerAccount(state, userData, details, credential, id, now = Date.now()) {
  requireThat(['CONTRATANTE', 'TRABALHADOR'].includes(userData.role), 'Perfil de cadastro inválido.');
  const email = String(userData.email || '').trim().toLowerCase();
  requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Informe um e-mail válido.');
  requireThat(!state.users.some(u => u.email.toLowerCase() === email), 'Este e-mail já está cadastrado.');
  requireThat(userData.nome?.trim().length >= 2, 'Informe seu nome completo.');
  requireThat(isValidCPF(details.cpf), 'CPF inválido.');
  const user = {
    id, nome: userData.nome.trim().slice(0, 100), email, telefone: String(userData.telefone || ''),
    role: userData.role, foto_perfil_url: userData.foto_perfil_url || '',
    status: userData.role === 'TRABALHADOR' ? 'PENDING' : 'APPROVED', data_criacao: new Date(now).toISOString(),
  };
  const privateDetails = Object.fromEntries(['cpf', 'cep', 'uf', 'cidade', 'rua', 'bairro', 'numero'].map(key => [key, String(details[key] || '').slice(0, 160)]));
  state.users.push(user);
  state.credentials[id] = credential;
  if (user.role === 'CONTRATANTE') state.contratanteDetails.push({ ...privateDetails, user_id: id, bio_curta: '', total_pedidos: 0 });
  else state.workerDetails.push({
    ...privateDetails, user_id: id, bio: String(details.bio || '').slice(0, 1000), categorias: details.categorias || [],
    nota_media: 0, portfolio_fotos: [], isOnline: true, diasTrabalho: 'Seg-Sex', horaInicio: '08:00', horaFim: '18:00', timeZone: 'America/Cuiaba',
  });
  return user;
}

function requireParticipant(order, actor) {
  requireThat(order && [order.worker_id, order.contratante_id].includes(actor.id), 'Você não participa deste atendimento.');
}

function removeAccount(state, id) {
  const removedOrders = new Set(state.orders.filter(o => o.worker_id === id || o.contratante_id === id).map(o => o.id));
  state.users = state.users.filter(u => u.id !== id);
  state.workerDetails = state.workerDetails.filter(d => d.user_id !== id);
  state.contratanteDetails = state.contratanteDetails.filter(d => d.user_id !== id);
  state.services = state.services.filter(s => s.worker_id !== id);
  state.orders = state.orders.filter(o => !removedOrders.has(o.id));
  state.reviews = state.reviews.filter(r => r.worker_id !== id && r.user_id !== id && !removedOrders.has(r.order_id));
  state.supportTickets = state.supportTickets.filter(t => t.user_id !== id);
  delete state.credentials[id];
  for (const [token, session] of Object.entries(state.sessions)) if (session.userId === id) delete state.sessions[token];
}

// Executado sobre o estado mais recente, dentro de uma transação IndexedDB.
export function applyCommand(state, token, command, now = Date.now()) {
  const actor = resolveSession(state, token, now);
  requireThat(actor, 'Sua sessão expirou. Entre novamente.');
  const admin = actor.role === 'ADMIN';
  const { type } = command;
  if (type === 'touch') { state.sessions[token].lastActivity = now; return; }
  if (type === 'patch') {
    const { entity, changes } = command;
    requireThat(FIELDS[entity], 'Operação indisponível.');
    for (const { id, patch } of changes) {
      const record = state[entity].find(r => r[idField(entity)] === id);
      requireThat(record, 'Registro não encontrado. Atualize a página.');
      const owner = entity === 'users' ? record.id : entity === 'services' ? record.worker_id : record.user_id;
      requireThat(owner === actor.id, 'Você só pode editar seus próprios dados.');
      requireThat(Object.keys(patch).every(key => FIELDS[entity].includes(key)), 'Campo protegido contra alteração.');
      if (entity === 'services' && 'preco_base' in patch) requireThat(Number.isFinite(patch.preco_base) && patch.preco_base > 0, 'Informe um preço válido.');
      Object.assign(record, patch);
    }
  } else if (type === 'saveService') {
    requireThat(actor.role === 'TRABALHADOR', 'Apenas profissionais podem cadastrar serviços.');
    const { service } = command;
    requireThat(Number.isFinite(service.preco_base) && service.preco_base > 0 && service.titulo?.trim(), 'Informe título e preço válidos.');
    const old = state.services.find(s => s.id === service.id);
    requireThat(!old || old.worker_id === actor.id, 'Este serviço pertence a outro profissional.');
    const safe = Object.fromEntries(FIELDS.services.map(key => [key, service[key] ?? '']));
    if (old) Object.assign(old, safe);
    else state.services.push({ ...safe, id: service.id, worker_id: actor.id });
  } else if (type === 'deleteService') {
    requireThat(state.services.some(s => s.id === command.id && s.worker_id === actor.id), 'Serviço não encontrado.');
    state.services = state.services.filter(s => s.id !== command.id);
  } else if (type === 'createOrder') {
    requireThat(actor.role === 'CONTRATANTE', 'Apenas clientes podem solicitar serviços.');
    const worker = state.users.find(u => u.id === command.worker_id && u.role === 'TRABALHADOR' && u.status === 'APPROVED');
    requireThat(worker, 'Profissional indisponível.');
    const service = state.services.find(s => s.id === command.servico_id);
    requireThat(!command.servico_id || service?.worker_id === worker.id, 'Serviço inválido.');
    requireThat(state.orders.filter(o => o.contratante_id === actor.id && o.worker_id === worker.id && !CLOSED.includes(o.status)).length < 2, 'Você já possui duas solicitações em andamento com este profissional.');
    state.orders.push({
      id: command.id, contratante_id: actor.id, worker_id: worker.id, servico_id: service?.id || null,
      status: 'PENDENTE', data: new Date(now).toLocaleDateString('pt-BR'), agendamento: command.agendamento,
      preco_final: service?.preco_base || 0,
      chat_history: [{ id: command.messageId, sender: actor.id, text: String(command.text || '').slice(0, 4000), time: new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }],
    });
  } else if (type === 'sendMessage') {
    const order = state.orders.find(o => o.id === command.orderId);
    requireParticipant(order, actor);
    requireThat(!CLOSED.includes(order.status), 'Este atendimento já foi encerrado.');
    const message = command.message;
    requireThat(message.text?.trim() || message.image, 'Digite uma mensagem.');
    requireThat(!message.isBudget || (actor.role === 'TRABALHADOR' && order.status === 'PENDENTE' && Number.isFinite(message.amount) && message.amount > 0), 'Orçamento inválido.');
    requireThat(!message.image || /^(data:image\/(webp|jpeg|png);base64,)/.test(message.image), 'Imagem inválida.');
    if (!order.chat_history.some(m => m.id === message.id)) order.chat_history.push({
      id: message.id, sender: actor.id, text: String(message.text || '').slice(0, 4000), image: message.image || null,
      time: new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      ...(message.isBudget ? { isBudget: true, amount: message.amount } : {}),
    });
    if (message.isBudget) order.preco_final = message.amount;
  } else if (type === 'changeStatus') {
    const order = state.orders.find(o => o.id === command.orderId);
    requireParticipant(order, actor);
    const worker = order.worker_id === actor.id;
    const pending = order.status === 'PENDENTE';
    const allowed = command.status === 'CANCELADO' ? !CLOSED.includes(order.status)
      : command.status === 'RECUSADO' ? worker && pending
      : command.status === 'EM_ANDAMENTO' ? pending && (worker || order.chat_history.some(m => m.isBudget))
      : command.status === 'CONCLUIDO' ? worker && order.status === 'EM_ANDAMENTO' : false;
    requireThat(allowed, 'Esta mudança de status não é permitida.');
    if (command.status === 'CONCLUIDO') {
      requireThat(Number.isFinite(command.price) && command.price > 0, 'Informe um valor final válido.');
      order.preco_final = command.price;
    }
    order.status = command.status;
  } else if (type === 'review') {
    const order = state.orders.find(o => o.id === command.order_id);
    requireParticipant(order, actor);
    requireThat(order.status === 'CONCLUIDO', 'Você só pode avaliar um atendimento concluído.');
    const isWorkerReview = actor.id === order.worker_id;
    const reviewId = `${order.id}_${actor.id}`;
    requireThat(!state.reviews.some(r => r.id === reviewId), 'Você já avaliou este atendimento.');
    requireThat(Number.isInteger(command.nota) && command.nota >= 1 && command.nota <= 5 && command.comentario?.trim().length >= 5, 'Informe uma nota e um comentário válidos.');
    state.reviews.push({ id: reviewId, order_id: order.id, worker_id: order.worker_id,
      user_id: order.contratante_id, nota: command.nota, comentario: command.comentario.trim().slice(0, 400),
      fotos: [], isWorkerReview, data: new Date(now).toLocaleDateString('pt-BR') });
  } else if (type === 'ticketMessage') {
    let ticket = state.supportTickets.find(t => t.id === command.ticketId);
    requireThat(command.text?.trim(), 'Digite uma mensagem.');
    if (!ticket) {
      requireThat(!admin, 'Chamado não encontrado.');
      ticket = state.supportTickets.find(t => t.user_id === actor.id && t.status === 'OPEN');
      if (!ticket) { ticket = { id: command.ticketId, user_id: actor.id, status: 'OPEN', messages: [] }; state.supportTickets.push(ticket); }
    }
    requireThat(ticket.status === 'OPEN' && (admin || ticket.user_id === actor.id), 'Chamado indisponível.');
    ticket.messages.push({ id: command.id, sender: admin ? 'ADMIN' : 'USER', text: command.text.trim().slice(0, 4000), time: new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) });
  } else if (type === 'closeTicket') {
    requireThat(admin, 'Apenas a administração pode encerrar chamados.');
    const ticket = state.supportTickets.find(t => t.id === command.id);
    requireThat(ticket, 'Chamado não encontrado.'); ticket.status = 'CLOSED';
  } else if (type === 'approveWorker' || type === 'rejectWorker') {
    requireThat(admin, 'Apenas a administração pode aprovar cadastros.');
    const user = state.users.find(u => u.id === command.id && u.role === 'TRABALHADOR');
    requireThat(user && user.status === 'PENDING', 'Cadastro pendente não encontrado.');
    if (type === 'approveWorker') user.status = 'APPROVED';
    else removeAccount(state, user.id);
  } else if (type === 'deleteAccount') {
    requireThat(command.id === actor.id || admin, 'Você não pode excluir esta conta.');
    requireThat(state.users.some(u => u.id === command.id && u.role !== 'ADMIN'), 'A conta administrativa não pode ser excluída.');
    removeAccount(state, command.id);
  } else {
    throw new Error('Operação desconhecida.');
  }
}
