import { describe, expect, it } from 'vitest';
import { mentionsContact } from './contact';

describe('mentionsContact', () => {
  it.each([
    'me chama no 65 99999-0000',
    '(65)99999.0000',
    'me passa seu whats',
    'chama no zap',
    'WhatsApp',
    'segue no insta @joao.eletricista',
  ])('detecta: %s', (text) => {
    expect(mentionsContact(text)).toBe(true);
  });

  it.each([
    'posso ir amanhã às 14:30',
    'o valor fica R$ 150,00',
    'dia 12/12/2026 de manhã',
    'são 3 cômodos e 2 banheiros',
  ])('ignora conversa normal: %s', (text) => {
    expect(mentionsContact(text)).toBe(false);
  });
});
