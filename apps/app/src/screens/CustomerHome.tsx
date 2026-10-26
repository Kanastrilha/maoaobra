import Ionicons from '@expo/vector-icons/Ionicons';
import type { Category, ProSearchResult } from '@maoaobra/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OrderRow } from '@/components/OrderRow';
import { useOrders } from '@/components/OrdersList';
import { Avatar, ErrorText, Loading, Muted, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { ACTIVE_STATUSES, categoryIcon } from '@/lib/labels';
import { useCurrentPoint } from '@/lib/location';
import { colors, tones } from '@/theme';

export function CustomerHome() {
  const { data: session } = authClient.useSession();
  const [category, setCategory] = useState<Category | null>(null);
  const location = useCurrentPoint();
  const orders = useOrders();
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  const point = location.data?.point;
  const pros = useQuery({
    queryKey: ['search', category?.slug, point?.lat, point?.lng],
    queryFn: () =>
      api<ProSearchResult[]>(
        `/pros?category=${category?.slug}&lat=${point?.lat}&lng=${point?.lng}`,
      ),
    enabled: Boolean(category && point),
  });
  const activeOrder = orders.data?.find((o) => ACTIVE_STATUSES.includes(o.status));
  const firstName = session?.user.name.split(' ')[0];

  return (
    <Screen brand>
      <View>
        <Muted>Olá, {firstName}</Muted>
        <Text style={styles.h1}>Do que você precisa?</Text>
      </View>

      {activeOrder && (
        <OrderRow
          order={activeOrder}
          as="customer"
          onPress={() => router.push({ pathname: '/orders/[id]', params: { id: activeOrder.id } })}
        />
      )}

      <View style={styles.grid}>
        {categories.data?.map((c) => {
          const selected = category?.slug === c.slug;
          return (
            <Pressable
              key={c.slug}
              style={[styles.tile, selected && styles.tileSelected]}
              onPress={() => setCategory(c)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View style={[styles.tileIcon, selected && { backgroundColor: colors.primaryTint }]}>
                <Ionicons
                  name={categoryIcon(c.slug)}
                  size={22}
                  color={selected ? colors.primary : colors.text}
                />
              </View>
              <Text style={styles.tileLabel}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {category && (
        <View>
          <Text style={styles.h2}>{category.name} perto de você</Text>
          {location.data && !location.data.precise && (
            <Muted>
              Mostrando a partir do centro de Cáceres. Permita a localização para ver quem está mais
              perto.
            </Muted>
          )}
          {pros.isPending && <Loading />}
          <ErrorText error={pros.error} />
          {pros.data?.length === 0 && (
            <Muted>Ninguém atende sua região nesta categoria ainda.</Muted>
          )}
          {pros.data?.map((pro) => (
            <Pressable
              key={pro.id}
              style={styles.pro}
              onPress={() => router.push({ pathname: '/pros/[id]', params: { id: pro.id } })}
              accessibilityRole="button"
            >
              <Avatar name={pro.name} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.proName}>{pro.name}</Text>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={16}
                    color={tones.success.text}
                    accessibilityLabel="Verificado"
                  />
                </View>
                <Muted>a {pro.distanceKm.toLocaleString('pt-BR')} km</Muted>
                <Text numberOfLines={1} style={{ color: colors.text }}>
                  {pro.bio}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 27, fontWeight: '800', letterSpacing: -0.6, color: colors.text, marginTop: 2 },
  h2: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: '40%',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  tileSelected: { borderColor: colors.primary, borderWidth: 2, padding: 13 },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  pro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  proName: { fontSize: 16, fontWeight: '700', color: colors.text },
});
