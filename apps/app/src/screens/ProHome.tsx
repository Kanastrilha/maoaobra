import type { MyProProfile } from '@maoaobra/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { OrdersList } from '@/components/OrdersList';
import { Button, Card, ErrorText, Label, Loading, Muted, Screen } from '@/components/ui';
import { api } from '@/lib/api';

export function ProHome() {
  const profile = useQuery({
    queryKey: ['pros', 'me'],
    queryFn: () => api<MyProProfile>('/pros/me'),
    // Enquanto pendente, confere de tempos em tempos se já foi aprovado
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 30_000 : false),
  });

  return (
    <Screen brand>
      {profile.isPending && <Loading />}
      <ErrorText error={profile.error} />

      {profile.data?.status === 'pending' && (
        <Card tone="warning">
          <Label>Cadastro em análise</Label>
          <Muted>
            Nossa equipe está conferindo seus dados. Assim que for aprovado, você começa a aparecer
            para os clientes da sua região.
          </Muted>
        </Card>
      )}

      {profile.data?.status === 'rejected' && (
        <Card>
          <Label>Cadastro não aprovado</Label>
          <Muted>Revise suas informações e envie novamente.</Muted>
          <Button label="Reenviar cadastro" onPress={() => router.push('/pro-application')} />
        </Card>
      )}

      {profile.data?.status === 'suspended' && (
        <Card>
          <Label>Conta suspensa</Label>
          <Muted>Fale com o suporte do Mão a Obra.</Muted>
        </Card>
      )}

      {profile.data?.status === 'approved' && (
        <>
          <Label>Seus pedidos</Label>
          <OrdersList as="pro" empty="Nenhum pedido ainda. Os novos aparecem aqui." />
        </>
      )}
    </Screen>
  );
}
