import { brMobilePhone } from '@maoaobra/shared';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand, Button, ErrorText, Field } from '@/components/ui';
import { authClient } from '@/lib/auth-client';
import { colors } from '@/theme';

export default function Login() {
  // Sai do login assim que a sessão existir, inclusive logo após verificar o código:
  // navegar direto daria corrida com a atualização da sessão e voltaria para cá
  const { data: session } = authClient.useSession();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    const parsed = brMobilePhone.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Celular inválido');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await authClient.phoneNumber.sendOtp({ phoneNumber: parsed.data });
    setLoading(false);
    if (result.error) {
      setError('Não foi possível enviar o código. Tente de novo em instantes.');
      return;
    }
    setSentTo(parsed.data);
  }

  async function verifyCode() {
    if (!sentTo) return;
    setLoading(true);
    setError(null);
    const result = await authClient.phoneNumber.verify({ phoneNumber: sentTo, code });
    setLoading(false);
    if (result.error) setError('Código inválido ou expirado.');
  }

  if (session) return <Redirect href="/" />;

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Brand size={32} />
        <Text style={styles.headline}>
          {sentTo ? 'Confira seu celular' : 'Entre com seu celular'}
        </Text>

        {sentTo ? (
          <>
            <Field
              label={`Digite o código enviado para ${sentTo}`}
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              autoFocus
            />
            <Button
              label="Entrar"
              onPress={verifyCode}
              loading={loading}
              disabled={code.length !== 6}
            />
            <Pressable
              onPress={() => {
                setSentTo(null);
                setCode('');
              }}
            >
              <Text style={styles.link}>Trocar número</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Field
              label="Seu celular com DDD"
              value={phone}
              onChangeText={setPhone}
              placeholder="(65) 99999-0000"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              autoFocus
            />
            <Button label="Receber código" onPress={sendCode} loading={loading} disabled={!phone} />
          </>
        )}

        <ErrorText error={error} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, paddingTop: 96, backgroundColor: colors.background },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 14 },
  headline: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 },
  link: { color: colors.text, fontWeight: '600', textAlign: 'center', padding: 8 },
});
