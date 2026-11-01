import { z } from 'zod';

const text = (max, min = 0) => z.string().trim().min(min).max(max);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
const emptyImage = z.literal('');
const money = z.number().finite().positive().max(1_000_000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001);
const categories = z.array(z.enum(['Eletricista', 'Encanador', 'Diarista', 'Pintor', 'Montador', 'TI', 'Freteiro'])).max(7);
const userPatch = z.object({ nome: text(100, 2).optional(), telefone: text(25).optional(), foto_perfil_url: emptyImage.optional() }).strict();
const workerPatch = z.object({
  bio: text(1000).optional(), categorias: categories.optional(), portfolio_fotos: z.array(z.never()).max(0).optional(),
  banner_url: emptyImage.optional(), isOnline: z.boolean().optional(),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  horaFim: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  diasTrabalho: text(80).optional(), timeZone: z.literal('America/Cuiaba').optional(),
}).strict();
const clientPatch = z.object({ bio_curta: text(500).optional(), banner_url: emptyImage.optional() }).strict();
const service = z.object({ id, titulo: text(100, 2), descricao: text(2000), preco_base: money, imagem_url: emptyImage.default('') }).strict();
const patch = (entity, schema) => z.object({ type: z.literal('patch'), entity: z.literal(entity), changes: z.array(z.object({ id, patch: schema }).strict()).min(1).max(1) }).strict();

export const commandSchema = z.union([
  z.object({ type: z.literal('register'), user: z.object({ nome: text(100, 2), telefone: text(25), role: z.enum(['CONTRATANTE', 'TRABALHADOR']) }).strict(),
    details: z.object({ cpf: text(14, 11), cep: z.string().regex(/^\d{8}$/), uf: z.string().regex(/^[A-Z]{2}$/), cidade: text(100, 2), rua: text(160, 2), bairro: text(100, 2), numero: text(100, 1), bio: text(1000).optional(), bio_curta: text(500).optional(), categorias: categories.optional() }).strict() }).strict(),
  patch('users', userPatch), patch('workerDetails', workerPatch), patch('contratanteDetails', clientPatch),
  z.object({ type: z.literal('saveService'), service }).strict(),
  z.object({ type: z.literal('deleteService'), id }).strict(),
  z.object({ type: z.literal('createOrder'), id, messageId: id, worker_id: id, servico_id: id.nullish(), text: text(4000, 1), agendamento: text(160).default('A combinar') }).strict(),
  z.object({ type: z.literal('sendMessage'), orderId: id, message: z.object({ id, text: text(4000).default(''), image: z.union([z.literal(''), z.null()]).optional(), isBudget: z.boolean().optional(), amount: money.optional() }).strict() }).strict(),
  z.object({ type: z.literal('changeStatus'), orderId: id, status: z.enum(['CANCELADO', 'RECUSADO', 'EM_ANDAMENTO', 'CONCLUIDO']), price: money.optional() }).strict(),
  z.object({ type: z.literal('review'), order_id: id, nota: z.number().int().min(1).max(5), comentario: text(400, 5) }).strict(),
  z.object({ type: z.literal('ticketMessage'), ticketId: id, id, text: text(4000, 1) }).strict(),
  z.object({ type: z.literal('closeTicket'), id }).strict(),
  z.object({ type: z.enum(['approveWorker', 'rejectWorker', 'deleteAccount']), id }).strict(),
]);
export const requestSchema = z.object({ requestId: id, command: commandSchema }).strict();
export const cents = value => Math.round(value * 100);

export function validCPF(value) {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  for (const length of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
    if (Number(digits[length]) !== (sum * 10 % 11) % 10) return false;
  }
  return true;
}
