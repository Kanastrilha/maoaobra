import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { expo } from '@better-auth/expo';
import { isBrMobileE164 } from '@maoaobra/shared';
import { betterAuth } from 'better-auth';
import { phoneNumber } from 'better-auth/plugins';
import { db } from './db';
import * as schema from './db/schema';
import { env } from './env';
import { sms } from './lib/sms';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema, usePlural: true }),
  trustedOrigins: [...env.APP_ORIGINS, 'maoaobra://'],
  user: {
    additionalFields: {
      // input: false — o cliente nunca escolhe o próprio papel; vira 'pro' só pelo fluxo de cadastro/aprovação
      role: { type: 'string', defaultValue: 'customer', input: false },
    },
  },
  rateLimit: {
    // ponytail: limite em memória vale por instância; trocar para storage 'database' ao rodar 2+ instâncias
    customRules: {
      '/phone-number/send-otp': { window: 60, max: 3 },
      '/phone-number/verify': { window: 60, max: 10 },
    },
  },
  plugins: [
    phoneNumber({
      phoneNumberValidator: isBrMobileE164,
      allowedAttempts: 3,
      // Não aguardar o envio: a doc do Better Auth recomenda, para não vazar tempo de resposta
      sendOTP: ({ phoneNumber, code }) => {
        sms.send(phoneNumber, `Mão a Obra: seu código é ${code}`).catch((error) => {
          console.error('[sms] falha ao enviar OTP', error);
        });
      },
      // Login e cadastro são o mesmo fluxo: o primeiro código verificado cria a conta
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.slice(1)}@phone.maoaobra.invalid`,
        // Nome vazio = onboarding pendente; o app pede o nome logo após o primeiro login
        getTempName: () => '',
      },
    }),
    expo(),
  ],
});
