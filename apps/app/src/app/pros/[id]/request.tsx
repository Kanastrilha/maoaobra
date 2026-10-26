import {
  type OrderCreateInput,
  PERIODS,
  type Period,
  type ProPublicProfile,
} from '@maoaobra/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Button,
  Chip,
  ErrorText,
  Field,
  Label,
  Loading,
  Muted,
  Row,
  Screen,
} from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, nextDays, periodLabel } from '@/lib/labels';
import { useCurrentPoint } from '@/lib/location';

export default function RequestService() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const location = useCurrentPoint();
  const pro = useQuery({
    queryKey: ['pro', id],
    queryFn: () => api<ProPublicProfile>(`/pros/${id}`),
  });

  const days = nextDays(7);
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(days[0] ?? '');
  const [period, setPeriod] = useState<Period>('morning');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  const create = useMutation({
    mutationFn: (input: OrderCreateInput) =>
      api<{ id: string }>('/orders', { method: 'POST', body: input }),
    onSuccess: ({ id: orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.replace({ pathname: '/orders/[id]', params: { id: orderId } });
    },
  });

  if (pro.isPending || location.isPending) return <Loading />;
  if (!pro.data || !location.data) return <ErrorText error={pro.error} />;
  const chosenCategory = category ?? pro.data.categories[0]?.slug ?? '';
  const point = location.data.point;

  return (
    <Screen title={`Pedido para ${pro.data.name}`} back>
      {pro.data.categories.length > 1 && (
        <>
          <Label>Qual serviço?</Label>
          <Row>
            {pro.data.categories.map((c) => (
              <Chip
                key={c.slug}
                label={c.name}
                selected={chosenCategory === c.slug}
                onPress={() => setCategory(c.slug)}
              />
            ))}
          </Row>
        </>
      )}

      <Field
        label="O que precisa ser feito?"
        value={description}
        onChangeText={setDescription}
        placeholder="Ex.: limpeza completa de casa com 3 quartos e 2 banheiros"
        multiline
        maxLength={1000}
      />

      <Label>Quando?</Label>
      <Row>
        {days.map((day) => (
          <Chip
            key={day}
            label={formatDate(day)}
            selected={scheduledDate === day}
            onPress={() => setScheduledDate(day)}
          />
        ))}
      </Row>
      <Row>
        {PERIODS.map((p) => (
          <Chip
            key={p}
            label={periodLabel[p]}
            selected={period === p}
            onPress={() => setPeriod(p)}
          />
        ))}
      </Row>
      <Muted>O horário exato vocês combinam pelo chat.</Muted>

      <Field
        label="Endereço do serviço"
        value={address}
        onChangeText={setAddress}
        placeholder="Rua, número e complemento"
        autoComplete="street-address"
      />
      <Field
        label="Bairro"
        value={neighborhood}
        onChangeText={setNeighborhood}
        placeholder="Bairro"
      />
      <Muted>
        O profissional só vê o bairro. O endereço completo é liberado após a confirmação.
      </Muted>

      <Button
        label="Enviar pedido"
        loading={create.isPending}
        onPress={() =>
          create.mutate({
            proId: id,
            category: chosenCategory,
            description,
            scheduledDate,
            period,
            address,
            neighborhood,
            location: point,
          })
        }
      />
      <ErrorText error={create.error} />
    </Screen>
  );
}
