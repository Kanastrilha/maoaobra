import type { PendingPro } from '@maoaobra/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { Button, Card, ErrorText, Label, Loading, Muted, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { colors } from '@/theme';

const formatCpf = (cpf: string) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

export function AdminHome() {
  const queryClient = useQueryClient();
  const pending = useQuery({
    queryKey: ['admin', 'pending'],
    queryFn: () => api<PendingPro[]>('/admin/pros/pending'),
  });
  const review = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) =>
      api(`/admin/pros/${id}/review`, { method: 'POST', body: { decision } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'pending'] }),
  });

  return (
    <Screen title="Admin · Aprovações">
      {pending.isPending && <Loading />}
      <ErrorText error={pending.error ?? review.error} />
      {pending.data?.length === 0 && <Muted>Nenhum cadastro aguardando aprovação.</Muted>}
      {pending.data?.map((pro) => (
        <Card key={pro.id}>
          <Label>{pro.name}</Label>
          <Muted>
            {pro.phoneNumber} · CPF {formatCpf(pro.cpf)}
          </Muted>
          <Muted>{pro.categories.map((c) => c.name).join(', ')}</Muted>
          <Text style={{ color: colors.text }}>{pro.bio}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Recusar"
                variant="danger"
                disabled={review.isPending}
                onPress={() => review.mutate({ id: pro.id, decision: 'rejected' })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Aprovar"
                disabled={review.isPending}
                onPress={() => review.mutate({ id: pro.id, decision: 'approved' })}
              />
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
