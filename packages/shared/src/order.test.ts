import { describe, expect, it } from 'vitest';
import { canTransition, isContactVisible, nextStatuses } from './order';

describe('máquina de estados do pedido', () => {
  it('caminho feliz: solicitado → aceito → confirmado → concluído', () => {
    expect(canTransition('requested', 'accepted', 'pro')).toBe(true);
    expect(canTransition('accepted', 'confirmed', 'customer')).toBe(true);
    expect(canTransition('confirmed', 'completed', 'pro')).toBe(true);
  });

  it('cada lado só executa as próprias ações', () => {
    expect(canTransition('requested', 'accepted', 'customer')).toBe(false);
    expect(canTransition('accepted', 'confirmed', 'pro')).toBe(false);
    expect(canTransition('confirmed', 'completed', 'customer')).toBe(false);
    expect(canTransition('confirmed', 'no_show', 'pro')).toBe(false);
  });

  it('não pula etapas nem sai de estado final', () => {
    expect(canTransition('requested', 'completed', 'pro')).toBe(false);
    expect(canTransition('requested', 'confirmed', 'customer')).toBe(false);
    expect(nextStatuses('completed', 'pro')).toEqual([]);
    expect(nextStatuses('cancelled', 'customer')).toEqual([]);
  });

  it('lista as ações disponíveis por papel', () => {
    expect(nextStatuses('requested', 'pro')).toEqual(['accepted', 'declined']);
    expect(nextStatuses('requested', 'customer')).toEqual(['cancelled']);
    expect(nextStatuses('confirmed', 'customer')).toEqual(['cancelled', 'no_show']);
  });

  it('contato só aparece depois da confirmação', () => {
    expect(isContactVisible('requested')).toBe(false);
    expect(isContactVisible('accepted')).toBe(false);
    expect(isContactVisible('confirmed')).toBe(true);
    expect(isContactVisible('cancelled')).toBe(false);
  });
});
