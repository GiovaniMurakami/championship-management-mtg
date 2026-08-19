# AI Context — championship-management-mtg

> Documento de contexto para assistentes de IA. Leia antes de modificar o projeto.
> Versão da API: **1.1.24** | Idioma da API e mensagens: **português (BR)**

**Frontend pareado:** repositório `championship-management-mtg-front` (SPA React). Contratos REST documentados em `docs/`.

---

## 1. O que é este projeto

API **Node.js + TypeScript** para **gerenciamento de torneios de Magic: The Gathering**:

- Autenticação JWT (RS256 em prod) + refresh token rotacionado
- CRUD de decks (`nomeConsolidado` = nome dado pelo usuário; admin pode alterar; `cartaRepresentativa` = arte do arquétipo no metagame)
- Torneios Swiss com top cut, pareamentos, resultados, check-in por rodada, link de ingresso tardio
- **Anfitrião de torneio** — admin designa usuário com permissões de gestão no torneio
- Ligas (rankings consolidados) e times (convites/solicitações)
- Metagame público por formato (torneios finalizados)
- Upload de imagens via presigned URL (S3)
- Anúncios do site + estatísticas
- Notificações em tempo real via **Ably**

**Deploy:** AWS Lambda (Serverless Framework) + MongoDB Atlas. Dev local: Express em `PORT` (default 3000).

---

## 2. Stack

| Tecnologia | Uso |
|---|---|
| Node.js 22 | Runtime |
| TypeScript 5 | Linguagem |
| Express 4 | HTTP |
| Mongoose 8 | MongoDB |
| Zod 4 | Validação de entrada |
| JWT (jsonwebtoken) | Auth RS256/HS256 |
| Ably | Pub/Sub realtime |
| AWS S3 + SSM | Imagens + chaves JWT |
| Nodemailer | E-mails transacionais |
| Jest + Supertest | Testes |
| esbuild + Serverless | Build e deploy Lambda |
| Pino | Logs |

---

## 3. Estrutura de pastas

```
src/
├── app.ts                      # Bootstrap: repos → serviços → casos → rotas → Express
├── handler.ts                  # Entry Lambda (serverless-http)
├── iniciarServidor.ts          # Dev local (nodemon)
├── composicao/
│   ├── repositorios.ts         # Wiring MongoDB
│   ├── servicos.ts             # Email, S3, etc.
│   ├── casos.ts                # Todos os use cases
│   └── rotas.ts                # Registro das rotas Express
├── dominio/
│   ├── entidade/               # Torneio, Deck, Usuario, Partida, etc.
│   └── gateway/                # Interfaces dos repositórios
├── casosDeUso/                 # Regras de negócio por domínio
│   ├── usuario/
│   ├── deck/
│   ├── torneio/                # Maior volume de lógica
│   ├── liga/
│   ├── time/
│   ├── metagame/
│   ├── site/
│   └── imagem/
├── infra/
│   ├── api/express/            # ApiExpress + rotas *Rota
│   ├── mongodb/repositorios/   # Implementações Mongoose
│   ├── ably/                   # NotificacaoAbly
│   ├── s3/, email/
│   └── socketio/eventosTorneio.ts  # EventEmitter interno → Ably
├── middlewares/express/        # autenticarJwt, rateLimiter, sanitização
└── helpers/
    ├── validacao/              # schemas.ts, validarBody/Params/Query
    ├── torneio/podeGerenciarTorneio.ts
    ├── data/brasilia.ts        # Fuso horário Brasília
    ├── error/ErroPersonalizado.ts
    └── jwt.ts, env.ts, logger.ts

docs/                           # Documentação por entidade (usuario, torneio, etc.)
tests/                          # Jest (~859 testes de unidade/integração)
```

**Arquitetura:** Clean Architecture + DDD, composição manual (sem DI container).

---

## 4. Convenções de código

### Padrão por camada
- **Entidade** — estado + invariantes simples
- **Gateway** — interface do repositório
- **Caso de uso** — `Classe.criar(deps)` factory + `executar(input)` async
- **Rota Express** — classe `*Rota implements Rotas` com `getCaminho()`, `getMetodo()`, `getMiddlewares()`, `getHandler()`
- **Repositório** — implementa gateway; Mongoose schemas na infra

### Nomenclatura
- Arquivos: `camelCase` com sufixo de papel (`criarTorneio.ts`, `buscarTorneio.express.route.ts`)
- IDs: **UUID v4** (`uuid` package)
- Campos JSON da API: português (`nome`, `torneioId`, `mensagem`, `erros`)
- Erros de negócio: `ErroPersonalizado.criar({ mensagem, status, erros? })`

### Novo endpoint (checklist)
1. Caso de uso em `casosDeUso/<dominio>/`
2. Registrar em `composicao/casos.ts`
3. Rota em `infra/api/express/rotas/<dominio>/`
4. Registrar em `composicao/rotas.ts`
5. Schema Zod em `helpers/validacao/schemas.ts` (params, query e/ou body)
6. Testes do caso de uso
7. Documentar em `docs/<entidade>.md`

---

## 5. Composição e bootstrap

```
app.ts
  → criarRepositorios()
  → criarServicos()
  → criarCasosDeUso(repos, servicos)
  → criarRotas(casos)          // rotas Express (inclui GET /metagame)
  → ApiExpress.criar(rotas)
  → inicializarAutenticarJwt()
```

**Lambda:** uma função no `serverless.yaml`:
- `api` (512MB/29s): todas as rotas (`/usuario`, `/deck`, `/torneio`, `/liga`, `/time`, `/site`, `/story-fundo`, `/imagem`, `/health`)
- `MONGODB_MAX_POOL_SIZE` default `1` (env + provider) para limitar conexões Atlas por instância
- Paths explícitos (não usar só `/{proxy+}` — quebra method/path no API Gateway + serverless-http)

---

## 6. Endpoints (resumo)

> Fonte de verdade: `src/composicao/rotas.ts` + `docs/`. Todos os bodies/queries/params relevantes validados com **Zod**.

### Usuário
```
POST /usuario/cadastrar, /login, /refresh-token, /logout
POST /usuario/reset-senha/solicitar, /confirmar
PUT  /usuario/atualizar
DELETE /usuario/conta                   (auth — body: { confirmacao } = nome do perfil; soft-delete/anonimiza; preserva decks e inscrições; marca excluido)
GET  /usuario/listar                    (admin — busca por nome/email; query bloqueadoTorneios; omite excluídos por padrão)
PUT  /usuario/:usuarioId/bloqueio-torneios (admin — body: { bloqueado }; remove inscricoes abertas)
```

### Deck
```
POST /deck/cadastrar
GET  /deck/listar, /deck/:id            (buscar: JWT opcional para deck oculto)
PUT  /deck/:id
DELETE /deck/:id
```

### Torneio
```
POST /torneio/criar                     (admin)
GET  /torneio/listar, /:torneioId, /:torneioId/seo, /:torneioId/standings, /:torneioId/partidas (leitura pública; listar usa JWT opcional para flag `inscrito`)
GET  /torneio/:torneioId/meu-historico (JWT)
GET  /:torneioId/standings, /partidas, /meu-historico
POST /:torneioId/inscrever, /checkin, /deck, /iniciar
POST /:torneioId/proxima-rodada, /refazer-rodada, /drop
POST /:torneioId/gerar-link-ingresso
POST /torneio/ingressar/:token          (body: { deckId })
POST /torneio/partida/:partidaId/resultado, /confirmar, /contestar
PUT  /torneio/partida/:partidaId/ajustar
PATCH /torneio/partida/:partidaId/mesa
PUT  /:torneioId/rodada/:rodada/pareamentos
PUT  /:torneioId/anfitriao              (admin — body: { anfitriaoId: uuid | null })
PUT  /:torneioId
DELETE /:torneioId
```

### Liga, Time, Site, Imagem
```
Liga:  POST /liga/criar (admin), GET /listar, /:id, /:id/ranking (leitura pública), PUT, DELETE
Metagame: GET /metagame, GET /metagame/:formato/:slug (leitura pública; torneios finalizados)
Time:  CRUD + convites; GET /listar, /:id (leitura pública); mutações com JWT
Time:  CRUD + entrar, sair, gerar-convite, entrar-por-convite, solicitar, aprovar, rejeitar
Site:  GET /site/anuncios, /anuncios/admin, /estatisticas; PUT /anuncios (admin); POST clique
Img:   POST /imagem/upload-url
Health: GET /health
```

---

## 7. Autenticação e autorização

| Middleware | Uso |
|---|---|
| `autenticarJwt` | JWT obrigatório no header `Authorization: Bearer` |
| `autenticarJwtOpcional` | `GET /deck/:id` — deck oculto só para dono autenticado |
| `autorizarAdmin` | Criar torneio/liga, salvar anúncios, listar usuários, definir anfitrião |

**JWT:** RS256 em produção (chaves no SSM ou Base64); HS256 só dev local (`JWT_SECRET`).

**Refresh:** rotacionado a cada uso; blacklist de access token no logout.

**Lockout login:** 5 falhas → bloqueio 15 min + e-mail.

### Permissões no torneio

Helper `podeGerenciarTorneio(torneio, usuarioId, isAdmin)` em `helpers/torneio/podeGerenciarTorneio.ts`:

- Admin global
- Dono (`donoId`)
- Anfitrião (`anfitriaoId`)

Usado em iniciar rodada, resultados, pareamentos, drop em nome de jogador, escolher deck para jogador, etc.

**Drop pelo próprio jogador:** `POST /torneio/:torneioId/drop` com body vazio (ou `jogadorId` = próprio id). Em `inscricoes_abertas` remove a inscrição; em `em_andamento` marca `dropped` e resolve partidas pendentes por WO.

### Conta — soft-delete (LGPD)

`DELETE /usuario/conta` com `{ confirmacao }` = nome atual do perfil:

- **Não** apaga decks nem inscrições/partidas
- Anonimiza: nome → `"Usuário excluído"`, e-mail interno, limpa nicks/telefone, senha aleatória
- Flags: `excluido: true`, `excluidoEm`, `bloqueadoTorneios: true`
- Remove anfitrião, refresh/reset tokens; login e refresh rejeitam conta excluída
- Bloqueia se for admin, dono de torneio ou dono de time
- Payloads públicos incluem `excluido` / `jogadorNExcluido` e nome via `helpers/torneio/resolverNomeJogador.ts` (`toUsuarioPublico`): **nick MOL** (`nickMTGO`), fallback para o nome cadastrado. Usado em ligas, decks, metagame e times. Torneios continuam com `exibirNomeJogador` (nome | nickMOL | nickArena).

### Bloqueio de torneios (admin)

`PUT /usuario/:usuarioId/bloqueio-torneios` — flag `bloqueadoTorneios`; ao bloquear, remove inscrições só de torneios em `inscricoes_abertas`.

---

## 8. Validação (Zod)

- Schemas: `src/helpers/validacao/schemas.ts`
- Campos base: `campos.ts` (`uuidCampo`, `paginacaoQueryCampos`)
- `validarBody()` — handler síncrono em POST/PUT/PATCH
- `validarParamsMiddleware()` / `validarQueryMiddleware()` — middleware Express
- Erro: `400` com `{ mensagem, erros: string[] }`
- Rotas **sem** Zod (proposital): `GET /health`, anúncios/estatísticas públicas, `GET /story-fundo` (listar), `POST /usuario/logout` — sem params/body/query

Testes de schemas: `tests/helpers/validacao/schemas.test.ts`

**Cobertura mínima (Jest):** statements/lines/functions ≥ 95%, branches ≥ 90%.

---

## 9. Torneio — lógica de negócio

### Status
`inscricoes_abertas` → `em_andamento` → `finalizado`

### Swiss
- Rodadas: `ceil(log₂(n))` com teto opcional `maxRodadas`
- Critérios de desempate WotC: pontos → OMW% → GW% → OGW%
- Bye para último colocado quando ímpar
- Pareamento evita rematch com backtracking; rematch só se for impossível evitar

### Campos notáveis
- `somRodada` — URL de áudio ao iniciar rodada (evento Ably + front toca)
- `secreto` — excluído de listagens públicas
- `corteTop`, `maxJogadores`, `exibirNomeJogador`
- `anfitriaoId` + objeto `anfitriao` populado em `buscarTorneio`

### Fuso horário (Brasília)
- `helpers/data/brasilia.ts`: `parseHorarioBrasilia()`, `toBrasiliaISO()`
- Criar/alterar torneio: `horario` sem fuso → interpretado como Brasília (UTC-3)
- Respostas serializam `horario`, `criadoEm`, `rodadaIniciadaEm` com offset `-03:00`

### Inscrição / check-in
- Exige `nickMTGO` no perfil para inscrever
- Check-in disponível 1h antes do `horario` e entre rodadas

---

## 10. Ably (realtime)

Fluxo: caso de uso ou rota → `eventosTorneio.emit(...)` → `NotificacaoAbly` → canal `torneio-{torneioId}`.

Eventos publicados:
```
rodada_iniciada, torneio_iniciado, torneio_finalizado,
resultado_registrado, resultado_confirmado, resultado_contestado, resultado_ajustado,
participante_inscrito, checkin_realizado, deck_inserido,
jogador_dropou, jogador_ingressou, corte_iniciado,
rodada_refeita, total_rodadas_alterado
```

Inicialização: `ABLY_API_KEY` em `app.ts` → `NotificacaoAbly.iniciar()`. Sem chave, eventos são emitidos mas não publicados.

---

## 11. Banco de dados

MongoDB Atlas via Mongoose.

**Coleções principais:** usuarios, decks, torneios, inscricoes, partidas, ligas, times, tokenblacklists, refreshtokens, loginattempts, resetsenhas, linkingressos, siteconfigs, ratelimits.

```bash
npm run db:create-indexes   # syncIndexes: cria faltantes e remove órfãos do schema
```

Listagem de torneios: sort `{ horario: 1, id: 1 }` com índices parciais `torneios_nao_secretos_*` (`secreto: false`).

---

## 12. Integrações externas

| Serviço | Uso |
|---|---|
| MongoDB | Persistência |
| AWS SSM | Chaves JWT (prod) |
| AWS S3 | Presigned upload (5 min, max 5 MB, image/*) |
| Ably | Realtime |
| Gmail/Nodemailer | Boas-vindas, reset senha, lockout |

---

## 13. Middleware global (Express)

1. trust proxy → helmet → cors → compression
2. `express.json` / `urlencoded` (100kb)
3. `express-mongo-sanitize`
4. `sanitizarEntrada` (strip HTML/null bytes)
5. Request logging (pino)

**Rate limiting:** janela de 15 min por IP (`ipv6Subnet` /56). Store `memory` (local) ou `mongo` (prod/Lambda).

| Limiter | Máx/15min | Uso |
|---|---|---|
| `auth` | 5 | login, cadastro, reset senha (mesmo bucket) |
| `refresh` | 40 | refresh token |
| `account` | 15 | logout, perfil |
| `deck` | 40 | criar deck |
| `inscricao` | 400 | inscrever, check-in, escolher deck |
| `resultado` | 600 | resultado/confirmação/contestação |
| `mutation` | 60 | demais mutações autenticadas (fora de torneio) |
| `torneio-mutation` | 500 | mutações de torneio (rodada, drop, mesa…) |
| `public-read` | 100 | listagens/buscas públicas (fora de torneio) |
| `torneio-read` | 800 | detalhe/listar/standings/partidas de torneio |
| `heavy-read` | 40 | metagame e ranking de liga |
| `public-action` | 30 | POST público (clique anúncio) |
| `upload` | 8 | presigned URL S3 |

`GET /health` sem limiter. Em rotas caras o limiter vem **antes** da validação, para contar spam de payload inválido.

---

## 14. Variáveis de ambiente

Ver `.env.example`. Obrigatórias para rodar:

```bash
MONGODB_URI=...
JWT_PRIVATE_KEY_BASE64=...   # ou JWT_SECRET em dev
JWT_PUBLIC_KEY_BASE64=...
PORT=3000
CORS_ORIGIN=http://localhost:5173
IS_LOCAL=true
```

Opcionais: `ABLY_API_KEY`, `AWS_S3_BUCKET`, `EMAIL_USER`, `EMAIL_PASS`, `FRONTEND_URL`, `RATE_LIMIT_STORE`, `LOG_LEVEL`.

**Nunca commitar `.env`.**

---

## 15. Testes

```bash
npm test              # jest --verbose (~859 testes; e2e em tests/e2e/)
npm run test:coverage # cobertura; limiar 95/90/95/95 em casosDeUso, entidades, helpers, middlewares (exclui e2e)
npm run lint          # eslint
npm run dev           # nodemon + ts-node (porta 3000)
npm run build         # esbuild
npm run deploy:dev    # serverless deploy stage dev
```

Cobertura forte em `casosDeUso/` (inclui `metagame/`), `dominio/`, `helpers/`, `middlewares/`. Rotas Express com cobertura mais esparsa; fluxos E2E de torneio em `tests/integracao/` e `tests/e2e/`.

---

## 16. Mapa de arquivos críticos

| Feature | Onde mexer |
|---|---|
| Novo endpoint | `casosDeUso/` → `composicao/casos.ts` → rota → `composicao/rotas.ts` → Zod |
| Permissão torneio | `helpers/torneio/podeGerenciarTorneio.ts` + use case específico |
| Anfitrião | `definirAnfitriaoTorneio.ts`, campo em `dominio/entidade/torneio.ts` |
| Soft-delete conta | `casosDeUso/usuario/excluirConta.ts`, `resolverNomeJogador.ts` |
| Bloqueio torneios | `casosDeUso/usuario/alterarBloqueioTorneios.ts` |
| Pareamento Swiss | `casosDeUso/torneio/iniciarTorneio.ts`, `iniciarProximaRodada.ts`, helpers em `helpers/torneio/` |
| Metagame | `casosDeUso/metagame/`, `docs/metagame.md` |
| Standings | `buscarStandings.ts` |
| Datas Brasília | `helpers/data/brasilia.ts` + rotas que serializam torneio |
| Validação API | `helpers/validacao/schemas.ts` |
| Eventos realtime | emit em use case/rota + `infra/ably/notificacaoAbly.ts` |
| Auth JWT | `helpers/jwt.ts`, `middlewares/express/autenticarJwt.ts` |
| Deploy | `serverless.yaml`, `esbuild.config.js`, `handler.ts` |
| Docs API | `docs/*.md`, `docs/INDEX.md` |

---

## 17. Gotchas e armadilhas

1. **`docs/README.md` pode estar parcialmente desatualizado** — priorize `AI_CONTEXT.md`, `composicao/rotas.ts` e o código.
2. **Lambda cold start** — pool Mongo max 1 (`MONGODB_MAX_POOL_SIZE`); Ably aguarda publicação no handler.
3. **Emails** — falhas são logadas, não propagadas ao cliente.
4. **`nomeConsolidado` / `cartaRepresentativa`** — nome do arquétipo e arte no metagame; admin altera depois. Deck travado de torneio aceita só esses dois campos. `cartaRepresentativa: null` volta à carta mais jogada.
5. **Comparar IDs** — sempre UUID string; use `uuidCampo` no Zod.
6. **Alterar torneio** — só em `inscricoes_abertas`; dono ou admin.
7. **Torneios secretos** — filtrados em `listarTorneios`, acessíveis por UUID direto.
8. **Não alterar contratos da API** sem alinhar com o front (`backendApi.js`).
9. **Eventos Ably** — incluir `torneioId` no payload; front assina `torneio-{id}`.
10. **Não criar commits** a menos que o usuário peça.

---

## 18. Diretrizes para assistentes de IA

### Ao implementar
1. Ler código adjacente — seguir factory `*.criar()` e padrão de rotas existente
2. Mudança mínima — não refatorar domínios não relacionados
3. Toda entrada HTTP → schema Zod + teste se alterar contrato
4. Permissões de torneio → `podeGerenciarTorneio`, não só `donoId === usuarioId`
5. Datas expostas ao cliente → `toBrasiliaISO()` quando aplicável
6. Side effect realtime → `eventosTorneio.emit` após persistência bem-sucedida

### Ao debugar
1. Verificar `.env` (MONGODB_URI, JWT)
2. Erro 403 em torneio → checar dono/admin/anfitrião
3. 400 validação → `schemas.ts` + mensagens Zod
4. Realtime não chega → `ABLY_API_KEY` + `NotificacaoAbly`
5. Horário errado → `parseHorarioBrasilia` na rota de criar/alterar

### O que evitar
- Framework DI (Inversify, etc.) — composição manual é o padrão
- Lógica de negócio em rotas Express — pertence ao caso de uso
- Documentação extra não solicitada
- Endpoints sem validação Zod

---

## 19. Referências cruzadas

| Documento | Conteúdo |
|---|---|
| `AI_CONTEXT.md` (este) | Contexto para IA — fonte primária do backend |
| `docs/INDEX.md` | Índice da documentação da API |
| `docs/torneio.md` | Fluxo completo de torneio |
| `docs/usuario.md` | Auth e usuários |
| `.env.example` | Variáveis de ambiente |
| `championship-management-mtg-front/AI_CONTEXT.md` | Contexto do SPA React |

---

*Última revisão: agosto/2026 — alinhado com v1.1.24 (mensagens de check-in com horário amigável de Brasília)*
