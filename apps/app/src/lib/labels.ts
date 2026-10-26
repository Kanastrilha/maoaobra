import type Ionicons from '@expo/vector-icons/Ionicons';
import type { OrderStatus, Period } from '@maoaobra/shared';
import type { Tone } from '@/theme';

export const statusLabel: Record<OrderStatus, string> = {
  requested: 'Aguardando profissional',
  accepted: 'Aguardando sua confirmação',
  declined: 'Recusado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Profissional não compareceu',
};

// O mesmo status lido pelo profissional
export const statusLabelForPro: Record<OrderStatus, string> = {
  ...statusLabel,
  requested: 'Novo pedido',
  accepted: 'Aguardando confirmação do cliente',
};

/** Cor do status: espera em âmbar, confirmado em verde; vermelho só para o que deu errado. */
export const statusTone: Record<OrderStatus, Tone> = {
  requested: 'warning',
  accepted: 'warning',
  declined: 'neutral',
  confirmed: 'success',
  completed: 'neutral',
  cancelled: 'neutral',
  no_show: 'danger',
};

export const ACTIVE_STATUSES: OrderStatus[] = ['requested', 'accepted', 'confirmed'];

export type IconName = keyof typeof Ionicons.glyphMap;

// ponytail: ícones por slug no app; categoria nova sem ícone cai no genérico
const CATEGORY_ICONS: Record<string, IconName> = {
  diarista: 'sparkles-outline',
  eletricista: 'flash-outline',
  montador: 'hammer-outline',
  capinador: 'leaf-outline',
};
export const categoryIcon = (slug: string) => CATEGORY_ICONS[slug] ?? 'construct-outline';

export const actionLabel: Record<OrderStatus, string> = {
  requested: '',
  accepted: 'Aceitar pedido',
  declined: 'Recusar',
  confirmed: 'Confirmar pedido',
  completed: 'Marcar como concluído',
  cancelled: 'Cancelar pedido',
  no_show: 'O profissional não apareceu',
};

/** Ações que pedem um segundo toque para confirmar. */
export const isDestructive = (to: OrderStatus) =>
  to === 'declined' || to === 'cancelled' || to === 'no_show';

export const periodLabel: Record<Period, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
};

/** '2026-11-03' → 'ter, 03/11' (sem passar por Date para não sofrer com fuso). */
export function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][
    new Date(year ?? 0, (month ?? 1) - 1, day).getDay()
  ];
  return `${weekday}, ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

/** Próximos dias no formato YYYY-MM-DD, a partir de hoje no fuso do aparelho. */
export function nextDays(count: number) {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  });
}
