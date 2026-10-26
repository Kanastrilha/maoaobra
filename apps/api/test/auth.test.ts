import { afterAll, describe, expect, it } from 'vitest';
import { app, as, closeAll, login, origin, requestCode } from './helpers';

afterAll(closeAll);

describe('login por telefone', () => {
  it('primeiro código verificado cria conta de cliente, sem nome (onboarding pendente)', async () => {
    const { res, cookie, phoneNumber } = await login();
    expect(res.statusCode).toBe(200);
    expect(cookie).toContain('session_token');

    const me = await as(cookie)('GET', '/me');
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ phoneNumber, role: 'customer', name: '' });
  });

  it('código errado não abre sessão', async () => {
    await requestCode('+5565999990002');
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/phone-number/verify',
      headers: origin,
      payload: { phoneNumber: '+5565999990002', code: '000000' },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('recusa telefone fora do padrão E.164 de celular brasileiro', async () => {
    const { res, code } = await requestCode('65999990000');
    expect(res.statusCode).toBe(400);
    expect(code).toBeUndefined();
  });

  it('usuário define o próprio nome, mas não o próprio papel', async () => {
    const { cookie } = await login();
    await as(cookie)('POST', '/api/auth/update-user', { name: 'Maria', role: 'admin' });

    const me = await as(cookie)('GET', '/me');
    expect(me.json()).toMatchObject({ role: 'customer' });
    await as(cookie)('POST', '/api/auth/update-user', { name: 'Maria' });
    expect((await as(cookie)('GET', '/me')).json()).toMatchObject({
      name: 'Maria',
      role: 'customer',
    });
  });

  it('/me sem sessão responde 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/me' });
    expect(res.statusCode).toBe(401);
  });
});
