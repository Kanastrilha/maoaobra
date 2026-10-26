import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Avatar, Button, Card, Muted, Screen } from '@/components/ui';
import { authClient } from '@/lib/auth-client';
import { colors } from '@/theme';

const formatPhone = (e164: string) => e164.replace(/^\+55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');

export default function Profile() {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  if (!session) return null;
  const { name, phoneNumber, role } = session.user;

  return (
    <Screen title="Perfil">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={name} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{name}</Text>
          {phoneNumber && <Muted>{formatPhone(phoneNumber)}</Muted>}
        </View>
      </View>

      {role === 'customer' && (
        <Card onPress={() => router.push('/pro-application')}>
          <Text style={{ fontWeight: '700', color: colors.text }}>
            Quero trabalhar no Mão a Obra
          </Text>
          <Muted>Ofereça seus serviços para clientes da sua região.</Muted>
        </Card>
      )}

      <Button
        label="Sair"
        variant="secondary"
        onPress={async () => {
          await authClient.signOut();
          queryClient.clear(); // não deixa dados de uma conta aparecerem na próxima
        }}
      />
    </Screen>
  );
}
