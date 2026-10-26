import type { Role } from '@maoaobra/shared';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyRequest } from 'fastify';
import { auth } from '../auth';
import { HttpError } from './http';

export type SessionUser = typeof auth.$Infer.Session.user;

export async function requireUser(request: FastifyRequest) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!session) throw new HttpError(401, 'Faça login para continuar');
  return session.user;
}

export async function requireRole(request: FastifyRequest, role: Role) {
  const user = await requireUser(request);
  if (user.role !== role) throw new HttpError(403, 'Você não tem permissão para isso');
  return user;
}
