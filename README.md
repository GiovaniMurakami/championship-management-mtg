# MTG Championship Management - API

API REST do sistema de campeonatos de Magic: The Gathering. Implementa autenticação, decks, torneios Swiss/Top Cut, ligas, times, metagame, anúncios, uploads e notificações em tempo real.

Versão atual: **1.1.29**

## Stack

- Node.js 22 e TypeScript 5;
- Express 4 em desenvolvimento e AWS Lambda em produção;
- DynamoDB para dados e cache;
- Serverless Framework e esbuild;
- Zod para validação;
- JWT, S3, SSM, SES e Ably;
- Jest e Supertest.

## Desenvolvimento local

```bash
npm install
cp .env.example .env
npm run dev
```

O servidor local usa `PORT=3000` por padrão e acessa os recursos AWS configurados no ambiente. Revise `.env.example` antes de iniciar; não use credenciais de produção no desenvolvimento.

## Scripts

```bash
npm run dev                    # Express com nodemon
npm run lint                   # ESLint
npm run build                  # bundle Lambda com esbuild
npm run test:unit              # testes unitários
npm run test:e2e               # suíte de integração configurada
npm run test:coverage          # cobertura unitária
npm run deploy:dev             # deploy stage dev
npm run deploy:prod            # deploy stage prod
```

Os testes E2E acessam infraestrutura configurada e exigem as variáveis específicas descritas nos scripts e no `AI_CONTEXT.md`.

## Arquitetura

```text
src/
|-- casosDeUso/          # regras de aplicação por domínio
|-- composicao/          # montagem de repositórios, serviços, casos e rotas
|-- dominio/             # entidades e contratos de gateways
|-- infra/               # Express, DynamoDB, cache, S3, e-mail e Ably
|-- middlewares/         # autenticação, rate limit e sanitização
|-- app.ts               # bootstrap da aplicação
|-- handler.ts           # entrada AWS Lambda
`-- iniciarServidor.ts   # entrada local
```

Contratos e decisões técnicas ficam em [`docs/`](./docs/) e o contexto operacional em [AI_CONTEXT.md](./AI_CONTEXT.md).

## Frontend pareado

O repositório `championship-management-mtg-front` é uma SPA React 19 com Vite, Tailwind CSS, TanStack Query, Radix UI e Ably. Em desenvolvimento local, configure o frontend com `VITE_BACKEND_DEV_URL=http://localhost:3000`.

## Deploy

O `serverless.yaml` descreve funções, eventos HTTP, tabelas e parâmetros por stage. O comando de deploy sempre executa o build antes de publicar.

## Licença

ISC.
