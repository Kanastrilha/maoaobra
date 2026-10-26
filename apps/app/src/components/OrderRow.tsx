import Ionicons from '@expo/vector-icons/Ionicons';
import type { OrderSummary } from '@maoaobra/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pill } from '@/components/ui';
import {
  categoryIcon,
  formatDate,
  periodLabel,
  statusLabel,
  statusLabelForPro,
  statusTone,
} from '@/lib/labels';
import { colors } from '@/theme';

export function OrderRow(props: {
  order: OrderSummary;
  as: 'customer' | 'pro';
  onPress: () => void;
}) {
  const { order } = props;
  const labels = props.as === 'pro' ? statusLabelForPro : statusLabel;
  return (
    <Pressable style={styles.row} onPress={props.onPress} accessibilityRole="button">
      <View style={styles.icon}>
        <Ionicons name={categoryIcon(order.category.slug)} size={22} color={colors.text} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.title} numberOfLines={1}>
          {order.category.name} · {order.counterpartName}
        </Text>
        <Text style={styles.meta}>
          {formatDate(order.scheduledDate)} · {periodLabel[order.period]}
        </Text>
        <Pill label={labels[order.status]} tone={statusTone[order.status]} />
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
});
