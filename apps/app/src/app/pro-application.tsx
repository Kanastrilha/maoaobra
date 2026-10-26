import type { Category, MyProProfile, Point, ProApplicationInput } from '@maoaobra/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Chip, ErrorText, Field, Label, Muted, Row, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { getCurrentPoint } from '@/lib/location';

const RADIUS_OPTIONS = [5, 10, 20, 30];

export default function ProApplication() {
  const queryClient = useQueryClient();
  const { refetch: refetchSession } = authClient.useSession();
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [cpf, setCpf] = useState('');
  const [radius, setRadius] = useState(10);
  const [location, setLocation] = useState<Point | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: (input: ProApplicationInput) =>
      api<MyProProfile>('/pros/me', { method: 'POST', body: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pros', 'me'] });
      await refetchSession(); // o papel mudou para 'pro'
      router.replace('/');
    },
  });

  async function locate() {
    setLocating(true);
    const { point, precise } = await getCurrentPoint();
    setLocating(false);
    if (!precise) {
      setLocationError('Permita o acesso à localização para continuar.');
      return;
    }
    setLocationError(null);
    setLocation(point);
  }

  const toggle = (slug: string) =>
    setSelected((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );

  return (
    <Screen title="Cadastro de profissional" back>
      <Muted>
        Para a segurança de todos, cada cadastro é analisado pela nossa equipe antes de aparecer
        para os clientes.
      </Muted>

      <Label>Quais serviços você faz?</Label>
      <Row>
        {categories.data?.map((category) => (
          <Chip
            key={category.slug}
            label={category.name}
            selected={selected.includes(category.slug)}
            onPress={() => toggle(category.slug)}
          />
        ))}
      </Row>

      <Field
        label="Conte sobre sua experiência"
        value={bio}
        onChangeText={setBio}
        placeholder="Há quanto tempo trabalha, o que faz de melhor, onde já atuou..."
        multiline
        maxLength={500}
      />
      <Field
        label="CPF"
        value={cpf}
        onChangeText={setCpf}
        placeholder="000.000.000-00"
        keyboardType="number-pad"
        maxLength={14}
      />

      <Label>Até que distância você atende?</Label>
      <Row>
        {RADIUS_OPTIONS.map((km) => (
          <Chip
            key={km}
            label={`${km} km`}
            selected={radius === km}
            onPress={() => setRadius(km)}
          />
        ))}
      </Row>

      <Label>De onde você sai para atender?</Label>
      <Button
        label={location ? 'Localização registrada ✓' : 'Usar minha localização atual'}
        variant="secondary"
        onPress={locate}
        loading={locating}
      />
      <ErrorText error={locationError} />

      <Button
        label="Enviar cadastro"
        loading={submit.isPending}
        disabled={!location || selected.length === 0}
        onPress={() =>
          location &&
          submit.mutate({ bio, cpf, categories: selected, serviceRadiusKm: radius, location })
        }
      />
      <ErrorText error={submit.error} />
    </Screen>
  );
}
