import { env } from '../env';

// ponytail: sem provedor de SMS/WhatsApp ainda (Zenvia, Twilio Verify ou WhatsApp Cloud API).
// Fora de produção o código vai para o log; em produção falha alto até o provedor ser plugado aqui.
export const sms = {
  async send(to: string, text: string) {
    if (env.NODE_ENV === 'production') throw new Error('Provedor de SMS não configurado');
    console.info(`[sms] ${to}: ${text}`);
  },
};
