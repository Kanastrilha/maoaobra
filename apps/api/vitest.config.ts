import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './test/database-url.ts';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      BETTER_AUTH_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres',
      BETTER_AUTH_URL: 'http://localhost:3333',
      APP_ORIGINS: 'http://localhost:8081',
    },
    globalSetup: './test/global-setup.ts',
    fileParallelism: false,
  },
});
