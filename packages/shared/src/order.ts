// Ciclo de vida do pedido (modelo B: taxa de serviço no app, serviço pago direto ao profissional).
// Fonte única de verdade: a API aplica estas regras e devolve ao app as transições possíveis.
export const ORDER_STATUSES = [
  'requested', // cliente pediu
  'accepted', // profissional topou; aguarda confirmação do cliente
  'declined', // profissional recusou
  'confirmed', // cliente confirmou (fase 2: pagando a taxa); contato liberado
  'completed', // profissional concluiu
  'cancelled',
  'no_show', // cliente informou que o profissional não apareceu (fase 2: reembolso da taxa)
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderActor = 'customer' | 'pro';

const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, readonly OrderActor[]>>> = {
  requested: { accepted: ['pro'], declined: ['pro'], cancelled: ['customer'] },
  accepted: { confirmed: ['customer'], cancelled: ['customer', 'pro'] },
  confirmed: { completed: ['pro'], cancelled: ['customer', 'pro'], no_show: ['customer'] },
  declined: {},
  completed: {},
  cancelled: {},
  no_show: {},
};

export const canTransition = (from: OrderStatus, to: OrderStatus, actor: OrderActor) =>
  TRANSITIONS[from][to]?.includes(actor) ?? false;

export const nextStatuses = (from: OrderStatus, actor: OrderActor) =>
  ORDER_STATUSES.filter((to) => canTransition(from, to, actor));

/** Telefone e endereço completo só aparecem depois da confirmação (alavanca contra desintermediação). */
export const isContactVisible = (status: OrderStatus) =>
  status === 'confirmed' || status === 'completed';

/** Chat aberto enquanto o pedido está em andamento. */
export const isChatOpen = (status: OrderStatus) =>
  status === 'requested' || status === 'accepted' || status === 'confirmed';

export const PERIODS = ['morning', 'afternoon', 'evening'] as const;
export type Period = (typeof PERIODS)[number];
