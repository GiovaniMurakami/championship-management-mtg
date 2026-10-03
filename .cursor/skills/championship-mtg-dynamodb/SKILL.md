---
name: championship-mtg-dynamodb
description: >-
  DynamoDB single-table patterns, cache invalidation, and consistency rules for
  championship-management-mtg. Use when changing repositories, queries, pk/sk,
  cache TTLs, BatchGet, migrations, or diagnosing stale list/standings data.
---

# Championship MTG — DynamoDB

Canonical detail: `docs/dynamodb-access-patterns.md` and `docs/arquitetura/invalidacao-cache.md`.

## Data model

- Tables: `DYNAMODB_DATA_TABLE` (entities) + `DYNAMODB_CACHE_TABLE` (responses + rate limit + versions)
- Keys: `pk` / `sk` only — **no GSI**
- Repositories extend `baseDynamoRepositorio`; declare cache domain in `super("…")` when writes must invalidate
- Always page `LastEvaluatedKey`; retry `UnprocessedItems` on batch writes

## Consistency

| Read | ConsistentRead |
|---|---|
| `GetItem` / `BatchGetItem` / command paths | true (default) |
| Public catalogs (torneio list/prefix, ligas, posts, artigos list/prefix, decks DECKS_PK/prefix, user index, story fundos) | false |

Date-filtered tournament list: SK between `TORNEIO#iso` and `TORNEIO#iso#\uffff`. Without dates, the whole `TORNEIOS` partition is still scanned then filtered in Node.

## Prefix lookup (short links)

`buscarPorPrefixo(id.slice(0,5))` on tournament/deck/article catalogs — eventual. Full UUID `GetItem` stays consistent. Ambiguous prefix → not found (require unique match).

## Cache

- Version item `pk=__cache_versions`; invalidate by bumping domain versions (no partition scan)
- Invalidation runs in **repository writes** (`baseDynamoRepositorio`), not in Ably handlers. Failure to invalidate **throws** (data may already be persisted)
- Capture dependency versions **before** read; only cache if versions still match on write
- Mutation responses wait for pending invalidations before JSON (multi-Lambda safety)
- Conservative invalidation: one tournament write can miss-cache other tournament snapshots
- **Read-path wiring is partial** — metagame (+ some deck update) get `servicos.cache` in `casos.ts`; do not assume standings/list SEO are hot-cached without checking composition
- Rate-limit counters also live on the cache table when configured
- Browser/React Query cache is independent of Dynamo cache
## Optimistic concurrency

Tournaments/matches use `version`. Conflicting writes must not silently overwrite.

## Migration

`migrarMongoParaDynamo.ts` is the only Mongo usage (devDependency). `--truncate` only for table names containing `local` or `test`. Prefer dry-run first.

## When adding a new entity

1. Design `pk`/`sk` access paths (list + by-id minimum)
2. Implement gateway + Dynamo repo
3. Wire `composicao/repositorios.ts`
4. Document pattern in `docs/dynamodb-access-patterns.md` if non-trivial
5. If cached: domain in `dependenciasCache` / repo `super()`, write through base helpers
