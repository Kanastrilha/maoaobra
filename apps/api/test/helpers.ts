import { eq } from 'drizzle-orm';
import { vi } from 'vitest';
import { buildApp } from '../src/app';
import { db, sql } from '../src/db';
import { users } from '../src/db/schema';
import { sms } from '../src/lib/sms';

export const app = buildApp();
export const origin = { origin: 'http://localhost:8081' };

export async function closeAll() {
  await app.close();
  await sql.end();
}

// Centro de Cáceres/MT; 0,027° de latitude ≈ 3 km
export const CACERES = { lat: -16.0705, lng: -57.6789 };
export const kmNorth = (km: number) => ({ lat: CACERES.lat + km / 111.2, lng: CACERES.lng });

export const randomPhone = () =>
  `+55659${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;

export function randomCpf() {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  for (const length of [9, 10]) {
    const sum = digits.reduce((acc, d, i) => acc + d * (length + 1 - i), 0);
    const rest = (sum * 10) % 11;
    digits.push(rest === 10 ? 0 : rest);
  }
  return digits.join('');
}

export async function requestCode(phoneNumber: string) {
  const send = vi.spyOn(sms, 'send').mockResolvedValue();
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/phone-number/send-otp',
    headers: origin,
    payload: { phoneNumber },
  });
  const code = send.mock.calls.at(-1)?.[1].match(/\d{6}/)?.[0];
  send.mockRestore();
  return { res, code };
}

/** Faz login (criando a conta no primeiro acesso) e devolve o cookie de sessão. */
export async function login(phoneNumber = randomPhone()) {
  const { code } = await requestCode(phoneNumber);
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/phone-number/verify',
    headers: origin,
    payload: { phoneNumber, code },
  });
  const setCookie = [res.headers['set-cookie'] ?? []].flat();
  const cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const me = await app.inject({ method: 'GET', url: '/me', headers: { cookie } });
  return { res, cookie, id: me.json().id as string, phoneNumber };
}

/** Requisição autenticada. */
export const as = (cookie: string) => (method: 'GET' | 'POST', url: string, payload?: object) =>
  app.inject({ method, url, headers: { ...origin, cookie }, payload });

export async function loginAdmin() {
  const session = await login();
  await db.update(users).set({ role: 'admin' }).where(eq(users.id, session.id));
  return session;
}

export async function approvedPro(
  admin: { cookie: string },
  options: {
    categories?: string[];
    location?: { lat: number; lng: number };
    radiusKm?: number;
  } = {},
) {
  const pro = await login();
  const res = await as(pro.cookie)('POST', '/pros/me', {
    bio: 'Trabalho com isso há mais de dez anos em Cáceres.',
    cpf: randomCpf(),
    categories: options.categories ?? ['diarista'],
    serviceRadiusKm: options.radiusKm ?? 10,
    location: options.location ?? CACERES,
  });
  if (res.statusCode !== 201) throw new Error(`cadastro falhou: ${res.body}`);
  const review = await as(admin.cookie)('POST', `/admin/pros/${pro.id}/review`, {
    decision: 'approved',
  });
  if (review.statusCode !== 204) throw new Error(`aprovação falhou: ${review.body}`);
  return pro;
}

export const orderInput = (proId: string, overrides: object = {}) => ({
  proId,
  category: 'diarista',
  description: 'Limpeza completa de casa com 3 quartos.',
  scheduledDate: '2026-11-03',
  period: 'morning',
  address: 'Rua Coronel Faria, 123',
  neighborhood: 'Centro',
  location: kmNorth(3),
  ...overrides,
});
