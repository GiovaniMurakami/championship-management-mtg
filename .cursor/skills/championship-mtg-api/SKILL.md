---
name: championship-mtg-api
description: >-
  Develop features in the championship-management-mtg API (Clean Architecture,
  composition, Zod, JWT, Lambda). Use when adding endpoints, use cases, routes,
  gateways, validation, auth, rate limits, articles SEO, or changing API contracts.
---

# Championship MTG — API

Read root `AI_CONTEXT.md` first. Language of API messages: Portuguese BR.

## Architecture (do not fight it)

```
dominio (entidade + gateway) → casosDeUso → infra (Express/Dynamo/Ably)
composicao/ wires everything — no DI container
```

- Use case: `Classe.criar(deps)` + `executar(input)`
- Route: `*Rota implements Rotas` with `getCaminho/getMetodo/getMiddlewares/getHandler`
- Errors: `ErroPersonalizado.criar({ mensagem, status, erros? })`
- Cases depend on **ports** (`CacheGateway`, `EventoTorneioGateway`), not concrete infra classes
- Business logic stays out of Express handlers

## New endpoint checklist

1. Caso de uso in `src/casosDeUso/<dominio>/`
2. Register in `src/composicao/casos.ts`
3. Route in `src/infra/api/express/rotas/<dominio>/`
4. Register in `src/composicao/rotas.ts`
5. Zod in `src/helpers/validacao/schemas.ts`
6. Tests under `tests/`
7. Update `docs/<entidade>.md` when the contract matters

Lambda paths must be explicit in `serverless.yaml` (not only `/{proxy+}`).

## Realtime

After successful persistence, publish via `EventoTorneioGateway.publicar` (wired to `eventosTorneio` / Ably). Payload must include `torneioId`. Channel: `torneio-{torneioId}`.

Not every internal `emit` reaches Ably — check `notificacaoAbly.ts` before assuming the front will hear it (see ADR-013 in `decisions.md`).
## Auth / permissions

| Middleware | When |
|---|---|
| `autenticarJwt` | Mutations that need a user |
| `autenticarJwtOpcional` | Public read with private extras (hidden deck, list `inscrito`) |
| `autorizarAdmin` | Global admin actions |
| `podeGerenciarTorneio` | Tournament ops (owner / admin / host) |

JWT: RS256 in prod (SSM/Base64); HS256 only local. Soft-delete preserves decks/history.

## Dates

Tournament times are Brasília (`helpers/data/brasilia.ts`). Serialize exposed datetimes with `-03:00` when applicable.

## Commands

```bash
npm run test:unit    # fast
npm test             # unit + e2e Dynamo (~15 min)
npm run dev          # local Express :3000
npm run deploy:homolog
```

Coverage thresholds are high on use cases/domain/helpers/middlewares. E2E needs real AWS tables from `.env.local`.

## Do not

- Add Inversify/Nest-style DI
- Rewrite into microservices/modules/CQRS folders without an explicit ask
- Change REST field names without updating the front `backendApi.js`
- Commit `.env*` secrets
- Use `--truncate` migration against homolog/prod

## More

- Durable decisions: [decisions.md](decisions.md)
- DynamoDB: skill `championship-mtg-dynamodb`
- Tournament domain: skill `championship-mtg-torneio`
