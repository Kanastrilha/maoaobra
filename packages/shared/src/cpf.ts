import { z } from 'zod';

export function isValidCpf(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const checkDigit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10]);
}

/** Aceita com ou sem pontuação; devolve só os 11 dígitos. */
export const cpfSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .refine(isValidCpf, 'CPF inválido');
