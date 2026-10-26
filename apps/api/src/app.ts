import cors from '@fastify/cors';
import { fromNodeHeaders } from 'better-auth/node';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { auth } from './auth';
import { sql } from './db';
import { env } from './env';
import { HttpError } from './lib/http';
import { requireUser } from './lib/session';
import { categoryRoutes } from './modules/categories/routes';
import { chatRoutes } from './modules/chat/routes';
import { orderRoutes } from './modules/orders/routes';
import { proRoutes } from './modules/pros/routes';

export function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });

  app.register(cors, {
    origin: env.APP_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: error.issues[0]?.message ?? 'Dados inválidos',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    if (error instanceof HttpError)
      return reply.status(error.statusCode).send({ error: error.message });
    // Erros do próprio Fastify com status de cliente (JSON malformado, etc.)
    const status = (error as { statusCode?: number }).statusCode;
    if (status && status < 500) return reply.status(status).send({ error: 'Requisição inválida' });
    request.log.error(error);
    return reply.status(500).send({ error: 'Erro interno. Tente novamente.' });
  });

  // Repassa /api/auth/* ao Better Auth convertendo a requisição do Fastify em Fetch Request
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      const response = await auth.handler(
        new Request(new URL(request.url, env.BETTER_AUTH_URL), {
          method: request.method,
          headers: fromNodeHeaders(request.headers),
          body: request.body ? JSON.stringify(request.body) : undefined,
        }),
      );
      reply.status(response.status);
      for (const [key, value] of response.headers) reply.header(key, value);
      return reply.send(response.body ? await response.text() : null);
    },
  });

  app.get('/health', async () => {
    await sql`select 1`;
    return { ok: true };
  });

  app.get('/me', async (request) => {
    const { id, name, phoneNumber, role } = await requireUser(request);
    return { id, name, phoneNumber, role };
  });

  app.register(categoryRoutes);
  app.register(proRoutes);
  app.register(orderRoutes);
  app.register(chatRoutes);

  return app;
}
