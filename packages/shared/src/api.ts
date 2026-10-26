// Contratos da API: os schemas validam a entrada na API; os tipos tipam as respostas no app.
import { z } from 'zod';
import { cpfSchema } from './cpf';
import { ORDER_STATUSES, type OrderStatus, PERIODS, type Period } from './order';

const point = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Point = z.infer<typeof point>;

export const PRO_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type ProStatus = (typeof PRO_STATUSES)[number];

export const proApplicationInput = z.object({
  bio: z.string().trim().min(20, 'Conte um pouco mais sobre você (mín. 20 caracteres)').max(500),
  cpf: cpfSchema,
  categories: z.array(z.string()).min(1, 'Escolha ao menos uma categoria').max(4),
  serviceRadiusKm: z.number().int().min(1).max(50),
  location: point,
});
export type ProApplicationInput = z.input<typeof proApplicationInput>;

export const proSearchQuery = z.object({
  category: z.string(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const proReviewInput = z.object({ decision: z.enum(['approved', 'rejected']) });

export const orderCreateInput = z.object({
  proId: z.string(),
  category: z.string(),
  description: z.string().trim().min(10, 'Descreva o serviço (mín. 10 caracteres)').max(1000),
  scheduledDate: z.iso.date(),
  period: z.enum(PERIODS),
  address: z.string().trim().min(5, 'Informe o endereço').max(200),
  neighborhood: z.string().trim().min(2, 'Informe o bairro').max(80),
  location: point,
});
export type OrderCreateInput = z.input<typeof orderCreateInput>;

export const orderTransitionInput = z.object({ to: z.enum(ORDER_STATUSES) });

export const messageInput = z.object({ body: z.string().trim().min(1).max(2000) });

export type Category = { slug: string; name: string };

export type ProSearchResult = { id: string; name: string; bio: string; distanceKm: number };

export type ProPublicProfile = { id: string; name: string; bio: string; categories: Category[] };

export type MyProProfile = {
  status: ProStatus;
  bio: string;
  serviceRadiusKm: number;
  categories: Category[];
};

export type PendingPro = {
  id: string;
  name: string;
  phoneNumber: string | null;
  bio: string;
  cpf: string;
  categories: Category[];
  createdAt: string;
};

export type OrderSummary = {
  id: string;
  status: OrderStatus;
  category: Category;
  scheduledDate: string;
  period: Period;
  counterpartName: string;
  updatedAt: string;
};

export type OrderDetail = OrderSummary & {
  role: 'customer' | 'pro';
  description: string;
  neighborhood: string;
  nextStatuses: OrderStatus[];
  /** null até o pedido ser confirmado */
  contact: { phoneNumber: string | null; address: string } | null;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  mentionsContact: boolean;
  createdAt: string;
};
