import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { approvedPro, as, closeAll, login, loginAdmin, orderInput } from './helpers';

afterAll(closeAll);

type Session = Awaited<ReturnType<typeof login>>;
let admin: Session;
let pro: Session;

beforeAll(async () => {
  admin = await loginAdmin();
  pro = await approvedPro(admin, { categories: ['diarista'] });
});

async function newOrder(overrides: object = {}) {
  const customer = await login();
  const res = await as(customer.cookie)('POST', '/orders', orderInput(pro.id, overrides));
  expect(res.statusCode).toBe(201);
  return { customer, orderId: res.json().id as string };
}

const move = (session: Session, orderId: string, to: string) =>
  as(session.cookie)('POST', `/orders/${orderId}/transitions`, { to });

describe('ciclo do pedido', () => {
  it('solicitado → aceito → confirmado → concluído, com contato liberado só após confirmar', async () => {
    const { customer, orderId } = await newOrder();

    const asPro = (await as(pro.cookie)('GET', `/orders/${orderId}`)).json();
    expect(asPro).toMatchObject({ status: 'requested', role: 'pro', contact: null });
    expect(asPro.nextStatuses).toEqual(['accepted', 'declined']);
    expect(JSON.stringify(asPro)).not.toContain('Rua Coronel Faria');

    expect((await move(pro, orderId, 'accepted')).json().contact).toBeNull();

    const confirmed = (await move(customer, orderId, 'confirmed')).json();
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.contact.phoneNumber).toBe(pro.phoneNumber);

    const proView = (await as(pro.cookie)('GET', `/orders/${orderId}`)).json();
    expect(proView.contact).toEqual({
      phoneNumber: customer.phoneNumber,
      address: 'Rua Coronel Faria, 123',
    });

    expect((await move(pro, orderId, 'completed')).json().status).toBe('completed');

    const listed = (await as(customer.cookie)('GET', '/orders')).json();
    expect(listed[0]).toMatchObject({
      id: orderId,
      status: 'completed',
      category: { slug: 'diarista' },
    });
  });

  it('cada lado só executa as próprias ações e não pula etapas', async () => {
    const { customer, orderId } = await newOrder();
    expect((await move(customer, orderId, 'accepted')).statusCode).toBe(409);
    expect((await move(pro, orderId, 'confirmed')).statusCode).toBe(409);
    expect((await move(pro, orderId, 'completed')).statusCode).toBe(409);
    expect((await move(customer, orderId, 'cancelled')).json().status).toBe('cancelled');
    expect((await move(pro, orderId, 'accepted')).statusCode).toBe(409);
  });

  it('"não compareceu" só a partir do dia marcado', async () => {
    const future = await newOrder({ scheduledDate: '2099-01-01' });
    await move(pro, future.orderId, 'accepted');
    const view = (await move(future.customer, future.orderId, 'confirmed')).json();
    expect(view.nextStatuses).not.toContain('no_show');
    expect((await move(future.customer, future.orderId, 'no_show')).statusCode).toBe(409);

    const past = await newOrder({ scheduledDate: '2020-01-01' });
    await move(pro, past.orderId, 'accepted');
    await move(past.customer, past.orderId, 'confirmed');
    expect((await move(past.customer, past.orderId, 'no_show')).json().status).toBe('no_show');
  });

  it('quem não participa não vê nem mexe no pedido', async () => {
    const { orderId } = await newOrder();
    const outsider = await login();
    expect((await as(outsider.cookie)('GET', `/orders/${orderId}`)).statusCode).toBe(404);
    expect((await move(outsider, orderId, 'cancelled')).statusCode).toBe(404);
    expect((await as(outsider.cookie)('GET', `/orders/${orderId}/messages`)).statusCode).toBe(404);
    expect((await as(outsider.cookie)('GET', '/orders')).json()).toEqual([]);
  });

  it('profissional não solicita serviço e cliente não pede categoria que o profissional não faz', async () => {
    const other = await approvedPro(admin);
    expect((await as(other.cookie)('POST', '/orders', orderInput(pro.id))).statusCode).toBe(403);

    const customer = await login();
    const wrongCategory = await as(customer.cookie)(
      'POST',
      '/orders',
      orderInput(pro.id, { category: 'eletricista' }),
    );
    expect(wrongCategory.statusCode).toBe(404);
  });

  it('valida a entrada com mensagem para o usuário', async () => {
    const customer = await login();
    const res = await as(customer.cookie)(
      'POST',
      '/orders',
      orderInput(pro.id, { description: 'oi' }),
    );
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('Descreva o serviço');
  });
});

describe('chat do pedido', () => {
  it('participantes conversam; tentativa de passar contato antes da confirmação é marcada', async () => {
    const { customer, orderId } = await newOrder();
    const send = (session: Session, body: string) =>
      as(session.cookie)('POST', `/orders/${orderId}/messages`, { body });

    expect((await send(customer, 'Tem disponibilidade de manhã?')).json().mentionsContact).toBe(
      false,
    );
    expect((await send(pro, 'Tenho sim, me chama no zap')).json().mentionsContact).toBe(true);

    await move(pro, orderId, 'accepted');
    await move(customer, orderId, 'confirmed');
    // Depois de confirmado o contato já é liberado: não faz sentido avisar
    expect((await send(customer, 'Meu whats é 65 99999-0000')).json().mentionsContact).toBe(false);

    const history = (await as(pro.cookie)('GET', `/orders/${orderId}/messages`)).json();
    expect(history.map((m: { body: string }) => m.body)).toEqual([
      'Tem disponibilidade de manhã?',
      'Tenho sim, me chama no zap',
      'Meu whats é 65 99999-0000',
    ]);
  });

  it('chat fecha quando o pedido termina', async () => {
    const { customer, orderId } = await newOrder();
    await move(pro, orderId, 'declined');
    const res = await as(customer.cookie)('POST', `/orders/${orderId}/messages`, { body: 'Oi?' });
    expect(res.statusCode).toBe(409);
  });
});
