import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  // Origens web liberadas no CORS e no Better Auth, separadas por vírgula
  APP_ORIGINS: z
    .string()
    .default('http://localhost:8081')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
});

export const env = schema.parse(process.env);
