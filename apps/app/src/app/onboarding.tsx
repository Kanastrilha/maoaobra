import { router } from 'expo-router';
import { useState } from 'react';
import { Button, ErrorText, Field, Muted, Screen } from '@/components/ui';
import { authClient } from '@/lib/auth-client';

export default function Onboarding() {
  const { refetch: refetchSession } = authClient.useSession();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState<'customer' | 'pro' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(intent: 'customer' | 'pro') {
    if (name.trim().length < 2) {
      setError('Informe seu nome');
      return;
    }
    setSaving(intent);
    setError(null);
    const result = await authClient.updateUser({ name: name.trim() });
    if (result.error) {
      setSaving(null);
      setError('Não foi possível salvar. Tente novamente.');
      return;
    }
    // Espera a sessão trazer o nome novo; senão a tela inicial ainda vê o nome vazio e volta para cá
    await refetchSession();
    setSaving(null);
    router.replace(intent === 'pro' ? '/pro-application' : '/');
  }

  return (
    <Screen title="Bem-vindo ao Mão a Obra">
      <Field
        label="Como você se chama?"
        value={name}
        onChangeText={setName}
        placeholder="Seu nome"
        autoComplete="name"
        autoFocus
      />
      <Muted>O que você quer fazer?</Muted>
      <Button
        label="Quero contratar um serviço"
        onPress={() => save('customer')}
        loading={saving === 'customer'}
        disabled={saving !== null}
      />
      <Button
        label="Quero trabalhar oferecendo serviços"
        variant="secondary"
        onPress={() => save('pro')}
        loading={saving === 'pro'}
        disabled={saving !== null}
      />
      <ErrorText error={error} />
    </Screen>
  );
}
