import { OrdersList } from '@/components/OrdersList';
import { Screen } from '@/components/ui';
import { authClient } from '@/lib/auth-client';

export default function Orders() {
  const { data: session } = authClient.useSession();
  const asPro = session?.user.role === 'pro';
  return (
    <Screen title="Pedidos">
      <OrdersList
        as={asPro ? 'pro' : 'customer'}
        empty={asPro ? 'Nenhum pedido ainda.' : 'Você ainda não fez nenhum pedido.'}
      />
    </Screen>
  );
}
