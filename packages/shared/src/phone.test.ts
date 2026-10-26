import { describe, expect, it } from 'vitest';
import { brMobilePhone } from './phone';

describe('brMobilePhone', () => {
  it.each([
    ['(65) 99999-0000', '+5565999990000'],
    ['65999990000', '+5565999990000'],
    ['+55 65 99999-0000', '+5565999990000'],
    ['5565999990000', '+5565999990000'],
  ])('normaliza %s', (input, expected) => {
    expect(brMobilePhone.parse(input)).toBe(expected);
  });

  it.each(['6599990000', '(65) 3222-0000', '(05) 99999-0000', '', '+1 650 555 0000'])(
    'rejeita %s',
    (input) => {
      expect(brMobilePhone.safeParse(input).success).toBe(false);
    },
  );
});
