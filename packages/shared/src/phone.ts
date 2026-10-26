import { z } from 'zod';

// Celular brasileiro em E.164: +55 + DDD (sem zero) + 9 + 8 dígitos
const E164_BR_MOBILE = /^\+55[1-9]{2}9\d{8}$/;

export const isBrMobileE164 = (phone: string) => E164_BR_MOBILE.test(phone);

/** Aceita o que o usuário digitar ("(65) 99999-0000", "+55 65 9...") e devolve +5565999990000. */
export const brMobilePhone = z
  .string()
  .transform((value) => {
    const digits = value.replace(/\D/g, '');
    return `+55${digits.length === 13 && digits.startsWith('55') ? digits.slice(2) : digits}`;
  })
  .refine(isBrMobileE164, 'Informe um celular válido com DDD');
