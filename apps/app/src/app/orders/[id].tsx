import Ionicons from '@expo/vector-icons/Ionicons';
import { type ChatMessage, isChatOpen, type OrderDetail, type OrderStatus } from '@maoaobra/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card, ErrorText, Label, Loading, Muted, Pill, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import {
  actionLabel,
  formatDate,
  isDestructive,
  periodLabel,
  statusLabel,
  statusLabelForPro,
  statusTone,
} from '@/lib/labels';
import { colors, tones } from '@/theme';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const order = useQuery({
    queryKey: ['order', id],
    queryFn: () => api<OrderDetail>(`/orders/${id}`),
    refetchInterval: 10_000,
  });
  const transition = useMutation({
    mutationFn: (to: OrderStatus) =>
      api<OrderDetail>(`/orders/${id}/transitions`, { method: 'POST', body: { to } }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', id], updated);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  if (order.isPending) return <Loading />;
  if (!order.data) return <ErrorText error={order.error} />;
  const o = order.data;
  const labels = o.role === 'pro' ? statusLabelForPro : statusLabel;
  const chatOpen = isChatOpen(o.status);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen
        title={`${o.category.name} · ${o.counterpartName}`}
        back
        footer={chatOpen && <Composer orderId={id} />}
      >
        <View style={{ gap: 8 }}>
          <Pill label={labels[o.status]} tone={statusTone[o.status]} />
          <Muted>
            {formatDate(o.scheduledDate)} · {periodLabel[o.period]} · {o.neighborhood}
          </Muted>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}>{o.description}</Text>
        </View>

        {o.contact ? (
          <Card tone="success">
            <Label>Contato liberado</Label>
            <Text style={{ color: colors.text }}>{o.contact.address}</Text>
            {o.contact.phoneNumber && (
              <Button
                label={`WhatsApp de ${o.counterpartName}`}
                variant="secondary"
                onPress={() => Linking.openURL(`https://wa.me/${o.contact?.phoneNumber?.slice(1)}`)}
              />
            )}
          </Card>
        ) : (
          o.status === 'accepted' &&
          o.role === 'customer' && (
            <Muted>Ao confirmar, telefone e endereço são liberados para vocês dois.</Muted>
          )
        )}

        {o.nextStatuses.map((to) => (
          <ActionButton
            key={to}
            to={to}
            loading={transition.isPending && transition.variables === to}
            disabled={transition.isPending}
            onConfirm={() => transition.mutate(to)}
          />
        ))}
        <ErrorText error={transition.error} />

        <Messages orderId={id} open={chatOpen} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Ações destrutivas (recusar, cancelar, não compareceu) pedem um segundo toque. */
function ActionButton(props: {
  to: OrderStatus;
  loading: boolean;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const destructive = isDestructive(props.to);
  return (
    <Button
      label={armed ? 'Toque de novo para confirmar' : actionLabel[props.to]}
      variant={destructive ? 'danger' : 'primary'}
      loading={props.loading}
      disabled={props.disabled}
      onPress={() => {
        if (destructive && !armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 4000);
          return;
        }
        props.onConfirm();
      }}
    />
  );
}

function Messages({ orderId, open }: { orderId: string; open: boolean }) {
  const { data: session } = authClient.useSession();
  const messages = useQuery({
    queryKey: ['messages', orderId],
    queryFn: () => api<ChatMessage[]>(`/orders/${orderId}/messages`),
    // ponytail: polling enquanto o chat está aberto; WebSocket quando o volume pedir
    refetchInterval: open ? 3_000 : false,
  });

  return (
    <View style={{ gap: 8 }}>
      <Label>Conversa</Label>
      {messages.data?.length === 0 && <Muted>Nenhuma mensagem ainda.</Muted>}
      {messages.data?.map((message) => {
        const mine = message.senderId === session?.user.id;
        return (
          <View key={message.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
            <Text style={{ color: mine ? colors.white : colors.text }}>{message.body}</Text>
            {message.mentionsContact && (
              <View style={styles.warning}>
                <Ionicons name="alert-circle" size={16} color={tones.warning.text} />
                <Text style={styles.warningText}>
                  Combine tudo pelo app até a confirmação. Telefone e endereço são liberados assim
                  que o pedido for confirmado.
                </Text>
              </View>
            )}
          </View>
        );
      })}
      {!open && <Muted>A conversa foi encerrada junto com o pedido.</Muted>}
      <ErrorText error={messages.error} />
    </View>
  );
}

function Composer({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: (text: string) =>
      api<ChatMessage>(`/orders/${orderId}/messages`, { method: 'POST', body: { body: text } }),
    onSuccess: (message) => {
      setBody('');
      queryClient.setQueryData<ChatMessage[]>(['messages', orderId], (current = []) => [
        ...current,
        message,
      ]);
    },
  });
  const canSend = Boolean(body.trim()) && !send.isPending;

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="Escreva uma mensagem"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
        />
        <Pressable
          style={[styles.send, !canSend && { backgroundColor: colors.surface }]}
          onPress={() => send.mutate(body.trim())}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Enviar"
        >
          {send.isPending ? (
            <ActivityIndicator color={colors.muted} />
          ) : (
            <Ionicons name="send" size={18} color={canSend ? colors.white : colors.muted} />
          )}
        </Pressable>
      </View>
      <ErrorText error={send.error} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '85%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 6 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.text, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  warning: {
    flexDirection: 'row',
    gap: 6,
    padding: 8,
    borderRadius: 10,
    backgroundColor: tones.warning.background,
  },
  warningText: { flex: 1, fontSize: 12, color: tones.warning.text },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 16,
    color: colors.text,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
