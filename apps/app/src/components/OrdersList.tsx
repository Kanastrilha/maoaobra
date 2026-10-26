import type { OrderSummary } from '@maoaobra/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { OrderRow } from '@/components/OrderRow';
import { ErrorText, Loading, Muted } from '@/components/ui';
import { api } from '@/lib/api';

export const useOrders = () =>
  useQuery({
    queryKey: ['orders'],
    queryFn: () => api<OrderSummary[]>('/orders'),
    refetchInterval: 15_000,
  });

export function OrdersList({ as, empty }: { as: 'customer' | 'pro'; empty: string }) {
  const orders = useOrders();

  if (orders.isPending) return <Loading />;
  if (orders.error) return <ErrorText error={orders.error} />;
  if (orders.data.length === 0) return <Muted>{empty}</Muted>;

  return orders.data.map((order) => (
    <OrderRow
      key={order.id}
      order={order}
      as={as}
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
    />
  ));
}
