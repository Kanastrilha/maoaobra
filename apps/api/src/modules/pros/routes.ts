import { proApplicationInput, proReviewInput, proSearchQuery } from '@maoaobra/shared';
import type { FastifyInstance } from 'fastify';
import { userIdParams } from '../../lib/http';
import { requireRole, requireUser } from '../../lib/session';
import * as pros from './service';

export async function proRoutes(app: FastifyInstance) {
  app.post('/pros/me', async (request, reply) => {
    const user = await requireUser(request);
    await pros.applyAsPro(user, proApplicationInput.parse(request.body));
    return reply.status(201).send(await pros.getMyProfile(user.id));
  });

  app.get('/pros/me', async (request) => {
    const user = await requireUser(request);
    return pros.getMyProfile(user.id);
  });

  // Catálogo público: busca sem login funciona (vitrine para quem ainda não se cadastrou)
  app.get('/pros', async (request) => pros.searchPros(proSearchQuery.parse(request.query)));

  app.get('/pros/:id', async (request) => {
    const { id } = userIdParams.parse(request.params);
    return pros.getPublicProfile(id);
  });

  app.get('/admin/pros/pending', async (request) => {
    await requireRole(request, 'admin');
    return pros.listPendingPros();
  });

  app.post('/admin/pros/:id/review', async (request, reply) => {
    await requireRole(request, 'admin');
    const { id } = userIdParams.parse(request.params);
    await pros.reviewPro(id, proReviewInput.parse(request.body));
    return reply.status(204).send();
  });
}
