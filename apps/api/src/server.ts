import { buildApp } from './app';
import { env } from './env';

const app = buildApp();
await app.listen({ port: env.PORT, host: '0.0.0.0' });
