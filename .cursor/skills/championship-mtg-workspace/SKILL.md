---
name: championship-mtg-workspace
description: >-
  Paired MTG championship workspace (API + SPA). Use when starting work in this
  multi-root workspace, choosing which repo to edit, branching to homolog,
  aligning API/front contracts, or when the user mentions championship-management-mtg,
  Fuguete Liga Magic, or the paired frontend.
---

# Championship MTG — Workspace

Two git repos, one product:

| Repo | Path | Runtime |
|---|---|---|
| API | `championship-management-mtg` | Node 22 + Express + DynamoDB → Lambda |
| Front | `championship-management-mtg-front` | React 19 + Vite + Amplify |

## Before any edit

1. Read that repo’s root `AI_CONTEXT.md` (source of truth; README/docs may be stale).
2. Prefer code + `composicao/` / `backendApi.js` over outdated markdown.
3. Reply in **Portuguese (BR)** unless the user asks otherwise.
4. **Do not commit or push** unless the user asks.

## Which repo?

| Change | Repo |
|---|---|
| Caso de uso, rota Zod, Dynamo, Ably emit, rate limit | API |
| Página, hook, UI, Scryfall, Amplify rewrite example | Front |
| Contrato REST (`mensagem`, campos PT) | Both — API first, then `backendApi.js` |
| Open Graph / WhatsApp preview | API share HTML + Amplify rewrite on the app |

## Homolog workflow

- Feature branch from `homolog`, merge back to `homolog`, push.
- API deploy stage for homolog is AWS stage `dev` (`deploy:homolog`).
- Front Amplify app `d32mjk9mbam2cb`, branch `homolog`, domain `app.tiagofuguete.com.br`.
- Keep unrelated refactors off the same PR as product features when possible.

## Cross-cutting rules

- IDs are UUID strings; compare with care (`normalizeId` on front).
- Public names often prefer nick MOL (`nickMTGO`).
- Tournament management: owner **or** admin **or** host (`podeGerenciarTorneio` / `canManageTournament`).
- Short public URLs: `{id.slice(0,5)}-{slug}` for tournaments, decks, articles.
- Verify front UI in the browser when changing SPA behavior.

## Skills in this workspace

- API: `championship-mtg-api`, `championship-mtg-dynamodb`, `championship-mtg-torneio`
- Front: `championship-mtg-front`, `championship-mtg-share-og`
- Decisions log: see `decisions.md` inside the api/front skills
