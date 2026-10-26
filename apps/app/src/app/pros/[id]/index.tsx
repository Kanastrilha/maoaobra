import Ionicons from '@expo/vector-icons/Ionicons';
import type { ProPublicProfile } from '@maoaobra/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Avatar, Button, Card, ErrorText, Label, Loading, Muted, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { colors, tones } from '@/theme';

export default function ProProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pro = useQuery({
    queryKey: ['pro', id],
    queryFn: () => api<ProPublicProfile>(`/pros/${id}`),
  });

  return (
    <Screen
      back
      footer={
        pro.data && (
          <Button
            label="Solicitar serviço"
            onPress={() => router.push({ pathname: '/pros/[id]/request', params: { id } })}
          />
        )
      }
    >
      {pro.isPending && <Loading />}
      <ErrorText error={pro.error} />
      {pro.data && (
        <>
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
            <Avatar name={pro.data.name} size={88} />
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>
              {pro.data.name}
            </Text>
            <Muted>{pro.data.categories.map((c) => c.name).join(' · ')}</Muted>
          </View>

          <Card tone="success">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Ionicons name="shield-checkmark" size={20} color={tones.success.text} />
              <Text style={{ flex: 1, color: tones.success.text, lineHeight: 20 }}>
                Verificado pela equipe do Mão a Obra. O contato é liberado depois que o pedido é
                confirmado.
              </Text>
            </View>
          </Card>

          <View style={{ gap: 6 }}>
            <Label>Sobre</Label>
            <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>{pro.data.bio}</Text>
          </View>
        </>
      )}
    </Screen>
  );
}
