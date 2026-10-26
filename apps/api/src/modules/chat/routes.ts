import { messageInput } from '@maoaobra/shared';
import type { FastifyInstance } from 'fastify';
import { idParams } from '../../lib/http';
import { requireUser } from '../../lib/session';
import * as chat from './service';

// ponytail: o app busca mensagens por polling; WebSocket quando a latência ou o volume pedirem
export async function chatRoutes(app: FastifyInstance) {
  app.get('/orders/:id/messages', async (request) => {
    const user = await requireUser(request);
    const { id } = idParams.parse(request.params);
    return chat.listMessages(user, id);
  });

  app.post('/orders/:id/messages', async (request, reply) => {
    const user = await requireUser(request);
    const { id } = idParams.parse(request.params);
    const { body } = messageInput.parse(request.body);
    return reply.status(201).send(await chat.sendMessage(user, id, body));
  });
}
