import { z } from 'zod';

/** Erro esperado de regra de negócio: vira resposta HTTP com a mensagem para o usuário. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const idParams = z.object({ id: z.uuid() });
export const userIdParams = z.object({ id: z.string().min(1) });

/** Data de hoje no fuso de Cáceres/MT (YYYY-MM-DD). */
export const todayInCaceres = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cuiaba' }).format(new Date());
