# Contexto do Backend — Championship Management MTG

> **Documento canônico:** use `AI_CONTEXT.md` na raiz do repositório. Este arquivo é um resumo legado em `.cursor/`.

Documentação interna para agentes. API Node.js 22 + TypeScript para gerenciamento de campeonatos de Magic: The Gathering.

## Arquitetura

Clean Architecture com composição manual (sem framework DI):

```
app.ts → criarRepositorios() + criarServicos() → criarCasosDeUso() → criarRotas() → ApiExpress
```

| Camada | Pasta | Responsabilidade |
|--------|-------|------------------|
| Domínio | `src/dominio/` | Entidades + interfaces (gateways) |
| Aplicação | `src/casosDeUso/` | Regras de negócio por domínio |
| Infra | `src/infra/` | Express, MongoDB, S3, Ably, ChatGPT, Email |
| Composição | `src/composicao/` | Wiring de dependências |
| Cross-cutting | `src/middlewares/`, `src/helpers/` | Auth, validação, erros, logs |

**Deploy:** AWS Lambda via Serverless (`handler.ts` + `serverless-http`). Duas funções:
- `api-auth` (256MB/15s): `/usuario`, `/deck`, `/imagem`, `/health`
- `api-torneio` (512MB/29s): `/torneio`, `/liga`, `/time`, `/site`

## Domínios e Funcionalidades

### Usuário (`casosDeUso/usuario/`)
- Cadastro com bcrypt + email boas-vindas
- Login com JWT (30min) + refresh token (7d, rotacionado)
- Lockout: 5 tentativas falhas → bloqueio 15min + email
- Atualizar perfil, logout (blacklist JWT + revoga refresh)
- Reset de senha via token temporário

### Deck (`casosDeUso/deck/`)
- CRUD de decks (maindeck, sideboard, commander)
- `nomeConsolidado` via ChatGPT (opcional, não bloqueia cadastro)
- Flag `oculto` — decks ocultos não aparecem em listagens públicas
- Flag `travado` — deck vinculado a torneio
- Visualizações incrementadas em `buscarDeck`

### Torneio (`casosDeUso/torneio/`)
- Ciclo: criar → inscrever → check-in → escolher deck → iniciar → rodadas Swiss → standings
- Pareamento Swiss com bye, mesas, contestação/confirmação de resultados
- Ajuste de resultado (admin/dono), refazer rodada, drop de jogador
- Link de ingresso com token temporário
- Torneios secretos, corte top, max rodadas/jogadores
- Eventos realtime via Ably (14+ tipos)

### Liga (`casosDeUso/liga/`)
- Agrupa até 25 torneios, tipos individual/times
- Ranking consolidado por liga

### Time (`casosDeUso/time/`)
- CRUD, convites (token UUID), solicitações de entrada (aprovar/rejeitar)
- Entrada direta (`POST /time/:id/entrar`), sair, entrar por convite

### Site (`casosDeUso/site/`)
- Anúncios públicos com tracking de cliques
- Admin salva configuração de anúncios

### Imagem (`casosDeUso/imagem/`)
- Presigned URL S3 (5min, max 5MB, tipos image/*)

## Autenticação

- **JWT:** RS256 em produção (SSM ou Base64), HS256 apenas dev local
- **Middleware:** `autenticarJwt` (obrigatório), `autenticarJwtOpcional` (público com owner)
- **Admin:** `autorizarAdmin` em criar torneio/liga e salvar anúncios; demais checks no use case via `isAdmin`
- **Roles:** `user` | `admin`

## Middleware Stack (global)

1. trust proxy → helmet → cors → compression
2. express.json/urlencoded (100kb)
3. express-mongo-sanitize
4. sanitizarEntrada (strip HTML/null bytes)
5. request logging (pino)

## Validação

- Zod schemas em `helpers/validacao/schemas.ts`
- `validarBody()`, `validarParamsMiddleware()`, `validarQueryMiddleware()`
- Todos os endpoints com entrada validam params/query/body conforme aplicável

## Banco de Dados

MongoDB Atlas via Mongoose. Coleções: usuarios, decks, torneios, inscricoes, partidas, ligas, times, tokenblacklists, refreshtokens, loginattempts, resetsenhas, linkingressos, siteconfigs, ratelimits.

Índices: `npm run db:create-indexes` (`infra/mongodb/criarIndices.ts`)

## Integrações Externas

| Serviço | Uso | Retry/Timeout |
|---------|-----|---------------|
| MongoDB | Persistência | pool max 3, timeouts configurados |
| AWS SSM | Chaves JWT prod | — |
| AWS S3 | Upload imagens | presigned 5min |
| Ably | Realtime torneio | 3 tentativas, aguarda no handler |
| OpenAI gpt-4o-mini | Nome arquétipo deck | 3 tentativas, 3.5s timeout |
| Gmail/Nodemailer | Emails transacionais | erros logados, não propagados |

## Padrão de Erros

`ErroPersonalizado` → `{ mensagem, erros? }` com status HTTP.
Handler global trata Mongoose validation → 400, demais → 500 genérico.

## Rate Limiting

Tiers por rota (15min window). Store configurável via `RATE_LIMIT_STORE`:
- `memory` — padrão local (`IS_LOCAL=true`)
- `mongo` — padrão em produção (distribuído entre instâncias Lambda)

## Auth opcional

`autenticarJwtOpcional` — usado em `GET /deck/:id` para permitir dono ver deck oculto sem tornar rota obrigatoriamente autenticada.

## Testes

Jest, ~85 arquivos. Coverage threshold alto em casosDeUso/dominio/helpers/middlewares.
Rotas Express com cobertura esparsa; fluxos E2E de torneio existem.

## Convenções

- IDs: UUID v4
- Rotas: classes `*Rota` implementando interface `Rotas`
- Use cases: `*.criar(deps)` factory + `executar(input)`
- Erros de negócio: `ErroPersonalizado.criar({ mensagem, status })`
- Não alterar contratos públicos da API sem necessidade

## Arquivos-chave

- `src/app.ts` — bootstrap
- `src/composicao/rotas.ts` — registro de rotas
- `src/infra/api/express/api.express.ts` — Express setup
- `src/handler.ts` — Lambda entry
- `serverless.yaml` — deploy AWS
