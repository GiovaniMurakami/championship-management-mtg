# Decisões da API (ADR curto)

Registro vivo. Atualize ao tomar decisões que um agente futuro precisaria conhecer.

## ADR-001 — Clean Architecture + composição manual

**Decisão:** Domínio → casos de uso → infra; wiring em `src/composicao/` sem container DI.

**Por quê:** Clareza e testabilidade sem overhead de framework.

**Consequência:** Novo caso de uso sempre entra por `criar()` + registro em `casos.ts`/`rotas.ts`.

## ADR-002 — DynamoDB single-table, sem GSI

**Decisão:** Uma tabela `pk`/`sk`; índices de acesso como itens derivados; sem GSI nesta passagem.

**Por quê:** Custo e padrões já estabelecidos; migração Mongo→Dynamo concluída no runtime.

**Consequência:** Novos acessos precisam de chave de partição pensada; filtros por status/nome ainda podem ser em memória. Ver `docs/dynamodb-access-patterns.md`.

## ADR-003 — Portas de cache e eventos

**Decisão:** Casos de uso recebem `CacheGateway` e `EventoTorneioGateway`; Ably continua ouvindo o `EventEmitter` em `eventosTorneio`.

**Por quê:** Parar de acoplar casos de uso a `CacheDynamoDbServico` e ao emitter de infra.

**Consequência:** Não reintroduzir imports de classes concretas de cache/eventos nos casos de uso.

## ADR-004 — Swiss no domínio

**Decisão:** `swiss.ts` vive em `src/dominio/torneio/swiss.ts`.

**Por quê:** Pareamento/desempate são regra de domínio, não orquestração de caso de uso.

## ADR-005 — Persistência torneio + partidas

**Decisão:** Use case coordena `partidaGateway.reconciliarRodada` e depois `torneioGateway.atualizar`. O repositório de torneio não instancia `PartidaDynamoRepositorio`. Sem `TransactWrite` único (limite de 25 itens).

**Por quê:** Separar responsabilidades e respeitar limites do DynamoDB.

## ADR-006 — Consistência seletiva

**Decisão:** Catálogos públicos (listagens, prefixo de id) usam leitura eventual; `GetItem`/`BatchGet` e fluxos de escrita/comando ficam consistentes.

**Por quê:** Metade do RCU em listas; comando e detalhe por id precisam de leitura forte.

**Contra:** Snapshot de lista pode ficar velho até TTL/invalidação (ex.: lista de torneios ~30s).

## ADR-007 — Sem CQRS folder / outbox / microserviços prematuros

**Decisão:** Recusar reescritas grandes sugeridas em reviews genéricos enquanto o monólito Lambda resolver o produto.

**Preferir:** Portas finas, access patterns documentados, otimizações locais mensuráveis.

## ADR-008 — Artigos com slug curto + share HTML

**Decisão:** URL pública `/artigos/{5}-{slug}`; `buscarPorPrefixo`; `GET /artigo/:id/seo` e `/artigo/.../share` com `og:image` = `capaUrl`.

**Por quê:** Mesmo padrão de torneios; crawlers/WhatsApp não executam o SPA.

## ADR-009 — Rate limits brandos (~+20%)

**Decisão:** Limites em `rateLimiter.ts` elevados ~20% (janela 15 min). Lockout de login (5 falhas / 15 min) permanece separado.

## ADR-010 — Homolog API stage `dev`

**Decisão:** `APP_ENV=homolog` → tabelas `…-dev-*` e stage Serverless `dev`. Production → `prod`.

## ADR-011 — Cache de leitura ainda parcial na composição

**Decisão:** Em `composicao/casos.ts`, `servicos.cache` vai sobretudo para **metagame** e **`AtualizarDeck`**. Standings/SEO/listar torneio têm suporte no código, mas muitos ainda **não recebem** o gateway na composição.

**Consequência:** `DYNAMODB_CACHE_ENABLED=true` sozinho não ativa todos os consumidores. Invalidação nas writes do repo continua; hits de leitura dependem do wiring.

## ADR-012 — Rate limit distribuído na cache table

**Decisão:** Com tabela de cache resolvida, o limiter usa Dynamo (`DynamoRateLimitStore`), não só memória por Lambda.

## ADR-013 — Lacunas Ably conhecidas

**Decisão atual:** `resultado_confirmado` e `torneio_excluido` são emitidos internamente em alguns fluxos, mas **não** entram no mapa de `NotificacaoAbly`. Interno `torneio_alterado` → Ably `torneio_atualizado`. Existe também `jogador_voltou`.
