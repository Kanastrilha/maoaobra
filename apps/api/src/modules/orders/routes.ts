import { orderCreateInput, orderTransitionInput } from '@maoaobra/shared';
import type { FastifyInstance } from 'fastify';
import { idParams } from '../../lib/http';
import { requireUser } from '../../lib/session';
import * as orders from './service';

export async function orderRoutes(app: FastifyInstance) {
  app.post('/orders', async (request, reply) => {
    const user = await requireUser(request);
    const order = await orders.createOrder(user, orderCreateInput.parse(request.body));
    return reply.status(201).send(order);
  });

  app.get('/orders', async (request) => orders.listMyOrders(await requireUser(request)));

  app.get('/orders/:id', async (request) => {
    const user = await requireUser(request);
    const { id } = idParams.parse(request.params);
    return orders.getOrder(user, id);
  });

  app.post('/orders/:id/transitions', async (request) => {
    const user = await requireUser(request);
    const { id } = idParams.parse(request.params);
    const { to } = orderTransitionInput.parse(request.body);
    await orders.transitionOrder(user, id, to);
    return orders.getOrder(user, id);
  });
}
