import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, type Tone, tones } from '@/theme';

export function Screen(props: {
  title?: string;
  /** Mostra a marca no lugar do título (telas iniciais das abas). */
  brand?: boolean;
  back?: boolean;
  right?: ReactNode;
  scroll?: boolean;
  /** Fica fixo embaixo, fora da rolagem (ex.: campo do chat). */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const body = <View style={styles.body}>{props.children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={props.footer ? ['top', 'bottom'] : ['top']}>
      {(props.title || props.back || props.brand) && (
        <View style={styles.header}>
          {props.back && (
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Voltar">
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            {props.brand ? (
              <Brand />
            ) : (
              <Text style={styles.headerTitle} numberOfLines={1}>
                {props.title}
              </Text>
            )}
          </View>
          {props.right}
        </View>
      )}
      {props.scroll === false ? body : <ScrollView>{body}</ScrollView>}
      {props.footer && <View style={styles.footer}>{props.footer}</View>}
    </SafeAreaView>
  );
}

export const Brand = ({ size = 24 }: { size?: number }) => (
  <Text style={[styles.brand, { fontSize: size }]} accessibilityRole="header">
    mão a obra<Text style={{ color: colors.primary }}>.</Text>
  </Text>
);

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function Button(props: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const variant = props.variant ?? 'primary';
  const inactive = props.loading || props.disabled;
  // Primário desativado fica cinza, não vermelho desbotado
  const muted = inactive && variant === 'primary';
  return (
    <Pressable
      style={[styles.button, styles[variant], muted && styles.primaryInactive]}
      onPress={props.onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
    >
      {props.loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.muted : colors.primary} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'secondary' && { color: colors.text },
            variant === 'danger' && { color: colors.primary },
            muted && { color: colors.muted },
            inactive && !muted && { opacity: 0.5 },
          ]}
        >
          {props.label}
        </Text>
      )}
    </Pressable>
  );
}

export function Chip(props: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.chip, props.selected && styles.chipSelected]}
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: props.selected }}
    >
      <Text style={[styles.chipText, props.selected && styles.chipTextSelected]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

export function Field({ label, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        {...input}
        style={[styles.input, input.multiline && styles.multiline]}
      />
    </View>
  );
}

export function Card(props: { children: ReactNode; onPress?: () => void; tone?: Tone }) {
  const tint = props.tone && tones[props.tone].background;
  const style = [styles.card, tint && { backgroundColor: tint, borderColor: tint }];
  return props.onPress ? (
    <Pressable style={style} onPress={props.onPress} accessibilityRole="button">
      {props.children}
    </Pressable>
  ) : (
    <View style={style}>{props.children}</View>
  );
}

export const Pill = ({ label, tone }: { label: string; tone: Tone }) => (
  <Text style={[styles.pill, { backgroundColor: tones[tone].background, color: tones[tone].text }]}>
    {label}
  </Text>
);

// ponytail: iniciais até a fase 1b trazer fotos de perfil
export function Avatar({ name, size = 52 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return (
    <View
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.33 }]}>{initials}</Text>
    </View>
  );
}

export const Label = ({ children }: { children: ReactNode }) => (
  <Text style={styles.label}>{children}</Text>
);
export const Muted = ({ children }: { children: ReactNode }) => (
  <Text style={styles.muted}>{children}</Text>
);
export const ErrorText = ({ error }: { error: unknown }) =>
  error ? (
    <Text style={styles.error}>{error instanceof Error ? error.message : String(error)}</Text>
  ) : null;
export const Row = ({ children }: { children: ReactNode }) => (
  <View style={styles.row}>{children}</View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { padding: 20, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  brand: { fontWeight: '800', letterSpacing: -0.6, color: colors.text },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.primary },
  primaryInactive: { backgroundColor: colors.surface },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipSelected: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextSelected: { color: colors.primary },
  field: { gap: 6 },
  label: { fontWeight: '700', color: colors.text, fontSize: 15 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  card: {
    gap: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  pill: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  avatar: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', color: colors.text },
  muted: { color: colors.muted, lineHeight: 20 },
  error: { color: colors.primary, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
