import { describe, expect, it } from 'vitest';
import { cpfSchema, isValidCpf } from './cpf';

describe('CPF', () => {
  it('aceita CPFs com dígitos verificadores corretos, com ou sem pontuação', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('11144477735')).toBe(true);
    expect(cpfSchema.parse('529.982.247-25')).toBe('52998224725');
  });

  it('recusa dígito verificador errado, repetidos e tamanho errado', () => {
    expect(isValidCpf('529.982.247-26')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('5299822472')).toBe(false);
  });
});
