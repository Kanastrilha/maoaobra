import { createHash, randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { requestSchema, validCPF, cents } from './validation.js';
import { fail, requireIdentity, requireAdmin, isAdmin, publicAccount, publicDetails } from './security.js';

const CLOSED = ['CONCLUIDO', 'RECUSADO', 'CANCELADO'];
const digest = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const moneyView = row => ({ ...row, ...(row.preco_centavos !== undefined ? { preco_base: row.preco_centavos / 100 } : {}), ...(row.preco_final_centavos !== undefined ? { preco_final: row.preco_final_centavos / 100 } : {}) });
const dateLabel = now => new Date(now).toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' });
const timeLabel = now => new Date(now).toLocaleTimeString('pt-BR', { timeZone: 'America/Cuiaba', hour: '2-digit', minute: '2-digit' });

export function createBackend(db) {
  const ref = (collection, id) => db.collection(collection).doc(id);
  async function quota(uid, action, max = 60) {
    const minute = Math.floor(Date.now() / 60000);
    const record = ref('rateLimits', digest(`${uid}:${action}:${minute}`));
    await db.runTransaction(async tx => {
      const count = (await tx.get(record)).data()?.count || 0;
      fail(count < max, 'Muitas tentativas. Aguarde um minuto.', 'resource-exhausted');
      tx.set(record, { count: count + 1, expiresAt: Timestamp.fromMillis((minute + 2) * 60000) });
    });
  }

  async function execute(request) {
    const uid = requireIdentity(request, false);
    await quota(uid, 'mutation');
    const parsed = requestSchema.safeParse(request.data);
    fail(parsed.success && JSON.stringify(request.data).length <= 20000,
      'Dados inválidos, campos protegidos ou upload remoto ainda não habilitado.', 'invalid-argument');
    const { command, requestId } = parsed.data;
    if (command.type !== 'register') requireIdentity(request);
    const now = Date.now();
    const fingerprint = digest(canonical(command));
    const receipt = ref('receipts', digest(`${uid}:${requestId}`));
    return db.runTransaction(async tx => {
      const accountRef = ref('accounts', uid);
      const account = (await tx.get(accountRef)).data();
      // Uma conta desativada perde os poderes mesmo que seu token ainda exista.
      if (command.type !== 'register') fail(account?.status === 'APPROVED', 'Conta indisponível.');
      const previous = (await tx.get(receipt)).data();
      if (previous) {
        fail(previous.fingerprint === fingerprint, 'Esta chave já foi usada com outros dados.', 'already-exists');
        return previous.result;
      }
      const writes = [];
      const write = (document, data) => writes.push(() => tx.set(document, data));
      const remove = document => writes.push(() => tx.delete(document));
      const notify = new Set([uid]);
      let publicChanged = false, adminChanged = false, result = { ok: true };
      const targetId = command.orderId || command.order_id || command.id || command.ticketId || uid;
      const readOrder = async id => {
        const order = (await tx.get(ref('orders', id))).data();
        fail(order && order.participantIds.includes(uid), 'Você não participa deste atendimento.');
        order.participantIds.forEach(id => notify.add(id));
        return order;
      };

      if (command.type === 'register') {
        fail(!account, 'Esta conta já possui cadastro.', 'already-exists');
        fail(typeof request.auth.token.email === 'string', 'Use uma conta autenticada por e-mail.', 'failed-precondition');
        fail(validCPF(command.details.cpf), 'CPF inválido.', 'invalid-argument');
        const { user, details } = command;
        const created = { id: uid, nome: user.nome, role: user.role, status: user.role === 'TRABALHADOR' ? 'PENDING' : 'APPROVED', foto_perfil_url: '', data_criacao: new Date(now).toISOString(), createdAt: now };
        const profile = { ...details, telefone: user.telefone, user_id: uid, email: request.auth.token.email,
          bio: details.bio || '', categorias: details.categorias || [], portfolio_fotos: [], banner_url: '',
          isOnline: true, horaInicio: '08:00', horaFim: '18:00', diasTrabalho: 'Seg-Sex', timeZone: 'America/Cuiaba' };
        write(accountRef, created); write(ref('privateProfiles', uid), profile);
        result = { ok: true, user: created }; adminChanged = true;
      } else if (command.type === 'patch') {
        const change = command.changes[0];
        fail(change.id === uid, 'Você só pode editar seus próprios dados.');
        fail(command.entity !== 'workerDetails' || account.role === 'TRABALHADOR');
        fail(command.entity !== 'contratanteDetails' || account.role === 'CONTRATANTE');
        const profile = (await tx.get(ref('privateProfiles', uid))).data();
        fail(profile, 'Perfil não encontrado.', 'not-found');
        const updated = { ...profile, ...change.patch };
        const next = { ...account, ...(change.patch.nome ? { nome: change.patch.nome } : {}), ...('foto_perfil_url' in change.patch ? { foto_perfil_url: change.patch.foto_perfil_url } : {}) };
        write(accountRef, next); write(ref('privateProfiles', uid), updated);
        if (account.role === 'TRABALHADOR') { write(ref('publicProfiles', uid), { ...publicAccount(next), details: publicDetails(updated) }); publicChanged = true; }
      } else if (command.type === 'saveService' || command.type === 'deleteService') {
        fail(account.role === 'TRABALHADOR', 'Apenas profissionais podem gerenciar serviços.');
        const id = command.service?.id || command.id;
        const existing = (await tx.get(ref('services', id))).data();
        fail(!existing || existing.worker_id === uid, 'Este serviço pertence a outro profissional.');
        if (command.type === 'deleteService') { fail(existing, 'Serviço não encontrado.', 'not-found'); remove(ref('services', id)); }
        else {
          const services = await tx.get(db.collection('services').where('worker_id', '==', uid).limit(51));
          fail(existing || services.size < 50, 'O limite é de 50 serviços por profissional.', 'resource-exhausted');
          const { preco_base, ...service } = command.service;
          write(ref('services', id), { ...service, worker_id: uid, preco_centavos: cents(preco_base), published: true, updatedAt: now });
        }
        publicChanged = true;
      } else if (command.type === 'createOrder') {
        fail(account.role === 'CONTRATANTE', 'Apenas clientes podem solicitar serviços.');
        const worker = (await tx.get(ref('accounts', command.worker_id))).data();
        fail(worker?.role === 'TRABALHADOR' && worker.status === 'APPROVED', 'Profissional indisponível.');
        const service = command.servico_id ? (await tx.get(ref('services', command.servico_id))).data() : null;
        fail(!command.servico_id || service?.worker_id === worker.id && service.published === true, 'Serviço inválido.');
        fail(!(await tx.get(ref('orders', command.id))).exists, 'Pedido já existe.', 'already-exists');
        const activeRef = ref('openOrders', digest(`${uid}:${worker.id}`));
        const count = (await tx.get(activeRef)).data()?.count || 0;
        fail(count < 2, 'Você já possui duas solicitações em andamento com este profissional.', 'resource-exhausted');
        write(activeRef, { count: count + 1 });
        write(ref('orders', command.id), { id: command.id, contratante_id: uid, worker_id: worker.id,
          participantIds: [uid, worker.id], participants: [publicAccount(account), publicAccount(worker)],
          servico_id: service?.id || null, status: 'PENDENTE', agendamento: command.agendamento,
          preco_final_centavos: service?.preco_centavos || 0, data: dateLabel(now), createdAt: now, updatedAt: now });
        write(ref('orders', command.id).collection('messages').doc(command.messageId), { id: command.messageId, sender: uid, text: command.text, time: timeLabel(now), createdAt: now });
        notify.add(worker.id);
      } else if (command.type === 'sendMessage') {
        const order = await readOrder(command.orderId);
        fail(!CLOSED.includes(order.status), 'Este atendimento já foi encerrado.', 'failed-precondition');
        const message = command.message;
        fail(message.text || message.isBudget, 'Digite uma mensagem.', 'invalid-argument');
        fail(!message.isBudget || uid === order.worker_id && order.status === 'PENDENTE' && message.amount, 'Orçamento inválido.');
        const messageRef = ref('orders', order.id).collection('messages').doc(message.id);
        fail(!(await tx.get(messageRef)).exists, 'Mensagem já existe.', 'already-exists');
        write(messageRef, { id: message.id, sender: uid, text: message.text, time: timeLabel(now), createdAt: now,
          ...(message.isBudget ? { isBudget: true, amount: message.amount, amount_centavos: cents(message.amount) } : {}) });
        write(ref('orders', order.id), { ...order, updatedAt: now,
          ...(message.isBudget ? { preco_final_centavos: cents(message.amount), hasBudget: true } : {}) });
      } else if (command.type === 'changeStatus') {
        const order = await readOrder(command.orderId);
        const worker = uid === order.worker_id, pending = order.status === 'PENDENTE';
        const allowed = command.status === 'CANCELADO' ? !CLOSED.includes(order.status)
          : command.status === 'RECUSADO' ? worker && pending
          : command.status === 'EM_ANDAMENTO' ? pending && (worker || order.hasBudget)
          : command.status === 'CONCLUIDO' ? worker && order.status === 'EM_ANDAMENTO' && command.price : false;
        fail(allowed, 'Esta mudança de status não é permitida.', 'failed-precondition');
        if (CLOSED.includes(command.status)) {
          const activeRef = ref('openOrders', digest(`${order.contratante_id}:${order.worker_id}`));
          const count = (await tx.get(activeRef)).data()?.count || 0;
          write(activeRef, { count: Math.max(0, count - 1) });
        }
        write(ref('orders', order.id), { ...order, status: command.status, updatedAt: now,
          ...(command.status === 'CONCLUIDO' ? { preco_final_centavos: cents(command.price) } : {}) });
      } else if (command.type === 'review') {
        const order = await readOrder(command.order_id);
        fail(order.status === 'CONCLUIDO', 'Conclua o atendimento antes de avaliar.', 'failed-precondition');
        const reviewId = `${order.id}_${uid}`;
        fail(!(await tx.get(ref('reviews', reviewId))).exists, 'Você já avaliou este atendimento.', 'already-exists');
        const isWorkerReview = uid === order.worker_id;
        const review = { id: reviewId, order_id: order.id, worker_id: order.worker_id, user_id: order.contratante_id,
          participantIds: order.participantIds, nota: command.nota, comentario: command.comentario, fotos: [], isWorkerReview, data: dateLabel(now), public_id: digest(reviewId) };
        write(ref('reviews', reviewId), review);
        if (!isWorkerReview) { write(ref('publicReviews', review.public_id), { id: review.public_id, public_id: review.public_id, worker_id: order.worker_id, nota: command.nota, comentario: command.comentario, fotos: [], isWorkerReview: false, data: review.data, published: true }); publicChanged = true; }
      } else if (command.type === 'approveWorker' || command.type === 'rejectWorker') {
        requireAdmin(account, request);
        const worker = (await tx.get(ref('accounts', command.id))).data();
        fail(worker?.role === 'TRABALHADOR' && worker.status === 'PENDING', 'Cadastro pendente não encontrado.', 'failed-precondition');
        const profile = (await tx.get(ref('privateProfiles', worker.id))).data();
        const next = { ...worker, status: command.type === 'approveWorker' ? 'APPROVED' : 'REJECTED' };
        write(ref('accounts', worker.id), next);
        if (next.status === 'APPROVED') { write(ref('publicProfiles', worker.id), { ...publicAccount(next), details: publicDetails(profile) }); publicChanged = true; }
        notify.add(worker.id); adminChanged = true;
      } else if (command.type === 'ticketMessage') {
        const ticketRef = ref('supportTickets', command.ticketId);
        let ticket = (await tx.get(ticketRef)).data();
        if (!ticket) {
          fail(!isAdmin(account, request), 'Chamado não encontrado.', 'not-found');
          const active = await tx.get(db.collection('supportTickets').where('user_id', '==', uid).where('status', '==', 'OPEN').limit(1));
          fail(active.empty, 'Você já possui um chamado aberto.', 'failed-precondition');
          ticket = { id: command.ticketId, user_id: uid, status: 'OPEN', createdAt: now };
        }
        fail(ticket.status === 'OPEN' && (ticket.user_id === uid || isAdmin(account, request)), 'Chamado indisponível.');
        const messageRef = ticketRef.collection('messages').doc(command.id);
        fail(!(await tx.get(messageRef)).exists, 'Mensagem já existe.', 'already-exists');
        write(ticketRef, { ...ticket, updatedAt: now });
        write(messageRef, { id: command.id, sender: isAdmin(account, request) ? 'ADMIN' : 'USER', text: command.text, time: timeLabel(now), createdAt: now });
        notify.add(ticket.user_id); adminChanged = true;
      } else if (command.type === 'closeTicket') {
        requireAdmin(account, request);
        const ticket = (await tx.get(ref('supportTickets', command.id))).data();
        fail(ticket, 'Chamado não encontrado.', 'not-found');
        write(ref('supportTickets', ticket.id), { ...ticket, status: 'CLOSED', updatedAt: now });
        notify.add(ticket.user_id); adminChanged = true;
      } else if (command.type === 'deleteAccount') {
        // Não simular exclusão completa antes de definir retenção e job recuperável.
        throw new HttpsError('failed-precondition', 'A exclusão remota ainda não está habilitada nesta etapa.');
      }
      write(receipt, { fingerprint, result, expiresAt: Timestamp.fromMillis(now + 86400000) });
      write(ref('auditLogs', randomUUID()), { actor: uid, action: command.type, target: targetId, at: now, requestId });
      for (const id of notify) write(ref('sync', id), { updatedAt: now, revision: requestId });
      if (publicChanged) write(ref('meta', 'public'), { updatedAt: now, revision: requestId });
      if (adminChanged) write(ref('meta', 'admin'), { updatedAt: now, revision: requestId });
      writes.forEach(apply => apply());
      return result;
    });
  }

  async function snapshot(request) {
    const uid = request.auth?.uid;
    if (uid) await quota(uid, 'snapshot', 120);
    const account = uid ? (await ref('accounts', uid).get()).data() : null;
    const admin = isAdmin(account, request);
    const currentUser = account?.status === 'APPROVED' && request.auth?.token.email_verified === true ? account : null;
    const [publicProfiles, publicServices, publicReviews] = await Promise.all([
      db.collection('publicProfiles').where('status', '==', 'APPROVED').limit(100).get(),
      db.collection('services').where('published', '==', true).limit(200).get(),
      db.collection('publicReviews').where('published', '==', true).limit(200).get(),
    ]);
    const users = new Map(), workerDetails = new Map(), contratanteDetails = new Map(), reviews = new Map();
    for (const doc of publicProfiles.docs) { const row = doc.data(); if (row.role === 'TRABALHADOR') { users.set(row.id, publicAccount(row)); workerDetails.set(row.id, publicDetails(row.details)); } }
    for (const doc of publicReviews.docs) reviews.set(doc.id, doc.data());
    let orders = [], supportTickets = [];
    if (currentUser) {
      const accounts = admin ? [...new Map([account, ...(await db.collection('accounts').limit(100).get()).docs.map(doc => doc.data())].map(row => [row.id, row])).values()] : [account];
      for (const row of accounts) {
        const profile = (await ref('privateProfiles', row.id).get()).data() || {};
        users.set(row.id, { ...row, telefone: profile.telefone || '', email: profile.email || '' });
        (row.role === 'TRABALHADOR' ? workerDetails : contratanteDetails).set(row.id, profile);
      }
      // Administradores não recebem conversas de pedidos de terceiros.
      const orderDocs = await db.collection('orders').where('participantIds', 'array-contains', uid).orderBy('updatedAt', 'desc').limit(50).get();
      orders = await Promise.all(orderDocs.docs.map(async doc => {
        const row = doc.data();
        row.participants.forEach(peer => { if (!users.has(peer.id)) users.set(peer.id, publicAccount(peer)); });
        const messages = await doc.ref.collection('messages').orderBy('createdAt', 'desc').limit(100).get();
        return { ...moneyView(row), chat_history: messages.docs.map(doc => doc.data()).reverse(), messagesHaveMore: messages.size === 100 };
      }));
      const ownReviews = await db.collection('reviews').where('participantIds', 'array-contains', uid).limit(100).get();
      ownReviews.docs.forEach(doc => { const row = doc.data(); reviews.set(row.public_id, row); });
      const tickets = await (admin ? db.collection('supportTickets') : db.collection('supportTickets').where('user_id', '==', uid)).limit(50).get();
      supportTickets = await Promise.all(tickets.docs.map(async doc => ({ ...doc.data(), messages: (await doc.ref.collection('messages').orderBy('createdAt', 'desc').limit(100).get()).docs.map(doc => doc.data()).reverse() })));
    }
    const self = users.get(uid);
    return { currentUser: currentUser ? self : null, users: [...users.values()], workerDetails: [...workerDetails.values()], contratanteDetails: [...contratanteDetails.values()],
      services: publicServices.docs.map(doc => moneyView(doc.data())), orders, reviews: [...reviews.values()], supportTickets,
      limits: { profiles: 100, services: 200, orders: 50, messages: 100, tickets: 50 } };
  }
  return { execute, snapshot };
}
