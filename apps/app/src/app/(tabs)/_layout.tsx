import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { type ColorValue, Platform } from 'react-native';
import { Loading } from '@/components/ui';
import { authClient } from '@/lib/auth-client';
import type { IconName } from '@/lib/labels';
import { colors } from '@/theme';

const icon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) => (
    // A cor vem de tabBar*TintColor, que são hex de colors
    <Ionicons name={name} size={24} color={color as string} />
  );

/** Área logada: exige sessão e nome antes de mostrar as abas. */
export default function TabsLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (!session.user.name) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontWeight: '600' },
        tabBarStyle: [
          { borderTopColor: colors.border },
          // No celular a altura vem da área segura; na web a padrão corta o rótulo
          Platform.OS === 'web' && { height: 60, paddingBottom: 8 },
        ],
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          tabBarIcon: icon('receipt-outline'),
          href: session.user.role === 'admin' ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: icon('person-outline') }}
      />
    </Tabs>
  );
}
