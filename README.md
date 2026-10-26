# Mão a Obra

Marketplace de serviços locais — piloto em Cáceres/MT. Plano e decisões em [docs/PLANO.md](docs/PLANO.md).

| Pasta             | O que é                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `apps/api`        | API (Node 24, Fastify, Drizzle, Postgres + PostGIS, Better Auth) |
| `apps/app`        | App Expo Router — iOS, Android e web                             |
| `packages/shared` | Schemas Zod e tipos usados pela API e pelo app                   |

A v1 (MVP em Firebase) está preservada na tag `mvp-firebase`.

## Rodando localmente

Pré-requisitos: Node 24+, pnpm (`npm i -g pnpm`) e Docker.

```bash
pnpm install
pnpm db:up                                  # Postgres + PostGIS em localhost:5434

cp apps/api/.env.example apps/api/.env      # troque o BETTER_AUTH_SECRET
cp apps/app/.env.example apps/app/.env
pnpm --filter @maoaobra/api db:migrate

pnpm dev:api                                # http://localhost:3333
pnpm dev:app                                # Expo: w = web, a = Android, i = iOS
```

Login é por celular com código. Em desenvolvimento o código **não é enviado por SMS**: ele aparece no log da API (`[sms] +55... seu código é 123456`).

Para aprovar profissionais você precisa de um admin. Faça login no app com o seu celular e depois:

```bash
pnpm --filter @maoaobra/api admin:promote "(65) 99999-0000"
```

Na web, permita a localização no navegador para a busca usar sua posição real (sem permissão, o app usa o centro de Cáceres).

## Qualidade

```bash
pnpm lint        # Biome
pnpm typecheck   # tsc em todos os pacotes
pnpm test        # testes de integração da API contra Postgres real (banco maoaobra_test)
```

O CI roda os três em todo push e pull request.

## Banco de dados

- Tabelas do domínio ficam em `apps/api/src/db/schema.ts`; as do Better Auth em `auth-schema.ts` (geradas pela CLI dele).
- Mudou o schema? Gere a migration com `pnpm --filter @maoaobra/api db:generate` e versione a pasta `apps/api/drizzle`.
- Os testes recriam o banco `maoaobra_test` do zero a cada execução, então também validam as migrations.
