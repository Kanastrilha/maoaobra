import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  approvedPro,
  as,
  CACERES,
  closeAll,
  kmNorth,
  login,
  loginAdmin,
  randomCpf,
} from './helpers';

afterAll(closeAll);

let admin: Awaited<ReturnType<typeof loginAdmin>>;
beforeAll(async () => {
  admin = await loginAdmin();
});

const application = (overrides: object = {}) => ({
  bio: 'Eletricista residencial com experiência em reformas.',
  cpf: randomCpf(),
  categories: ['eletricista'],
  serviceRadiusKm: 10,
  location: CACERES,
  ...overrides,
});

const search = (category: string, point: { lat: number; lng: number }) =>
  as('')('GET', `/pros?category=${category}&lat=${point.lat}&lng=${point.lng}`);

describe('cadastro e aprovação de profissional', () => {
  it('cadastro fica pendente, vira papel pro e não aparece na busca', async () => {
    const pro = await login();
    const res = await as(pro.cookie)(
      'POST',
      '/pros/me',
      application({ categories: ['capinador'] }),
    );
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ status: 'pending', categories: [{ slug: 'capinador' }] });
    expect((await as(pro.cookie)('GET', '/me')).json().role).toBe('pro');

    const found = (await search('capinador', CACERES)).json();
    expect(found.map((p: { id: string }) => p.id)).not.toContain(pro.id);
  });

  it('admin vê pendentes e aprova; cliente e profissional não aprovam', async () => {
    const pro = await login();
    await as(pro.cookie)('POST', '/pros/me', application());
    const pending = await as(admin.cookie)('GET', '/admin/pros/pending');
    expect(pending.json().map((p: { id: string }) => p.id)).toContain(pro.id);

    const customer = await login();
    const forbidden = await as(customer.cookie)('POST', `/admin/pros/${pro.id}/review`, {
      decision: 'approved',
    });
    expect(forbidden.statusCode).toBe(403);
    const self = await as(pro.cookie)('POST', `/admin/pros/${pro.id}/review`, {
      decision: 'approved',
    });
    expect(self.statusCode).toBe(403);

    const ok = await as(admin.cookie)('POST', `/admin/pros/${pro.id}/review`, {
      decision: 'approved',
    });
    expect(ok.statusCode).toBe(204);
    expect((await as(pro.cookie)('GET', '/pros/me')).json().status).toBe('approved');
  });

  it('recusa CPF inválido e CPF já usado por outra pessoa', async () => {
    const first = await login();
    const invalid = await as(first.cookie)(
      'POST',
      '/pros/me',
      application({ cpf: '111.111.111-11' }),
    );
    expect(invalid.statusCode).toBe(400);

    const cpf = randomCpf();
    expect((await as(first.cookie)('POST', '/pros/me', application({ cpf }))).statusCode).toBe(201);
    const second = await login();
    const duplicated = await as(second.cookie)('POST', '/pros/me', application({ cpf }));
    expect(duplicated.statusCode).toBe(409);
  });

  it('recusa categoria que não existe', async () => {
    const pro = await login();
    const res = await as(pro.cookie)(
      'POST',
      '/pros/me',
      application({ categories: ['astronauta'] }),
    );
    expect(res.statusCode).toBe(400);
  });
});

describe('busca por raio', () => {
  it('encontra profissional aprovado com a distância real, dentro do raio dele', async () => {
    const pro = await approvedPro(admin, { categories: ['montador'], radiusKm: 10 });
    const results = (await search('montador', kmNorth(3))).json();
    const found = results.find((p: { id: string }) => p.id === pro.id);
    expect(found).toBeDefined();
    expect(found.distanceKm).toBeGreaterThan(2.8);
    expect(found.distanceKm).toBeLessThan(3.2);
    expect(found).not.toHaveProperty('phoneNumber');
  });

  it('não encontra quem está fora do raio de atendimento', async () => {
    const pro = await approvedPro(admin, { categories: ['montador'], radiusKm: 5 });
    const results = (await search('montador', kmNorth(8))).json();
    expect(results.map((p: { id: string }) => p.id)).not.toContain(pro.id);
  });

  it('não encontra quem não atende a categoria', async () => {
    const pro = await approvedPro(admin, { categories: ['diarista'] });
    const results = (await search('eletricista', CACERES)).json();
    expect(results.map((p: { id: string }) => p.id)).not.toContain(pro.id);
  });

  it('perfil público mostra só profissionais aprovados, sem telefone', async () => {
    const pro = await approvedPro(admin, { categories: ['diarista', 'capinador'] });
    const profile = await as('')('GET', `/pros/${pro.id}`);
    expect(profile.statusCode).toBe(200);
    expect(profile.json().categories).toHaveLength(2);
    expect(profile.json()).not.toHaveProperty('phoneNumber');

    const pending = await login();
    await as(pending.cookie)('POST', '/pros/me', application());
    expect((await as('')('GET', `/pros/${pending.id}`)).statusCode).toBe(404);
  });
});
