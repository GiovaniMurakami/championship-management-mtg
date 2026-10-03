---
name: championship-mtg-torneio
description: >-
  Tournament Swiss rules, host permissions, Ably events, check-in, drop, and
  pairing for championship-management-mtg. Use when changing rodadas, standings,
  resultados, anfitrião, inscrição, top cut, or realtime tournament behavior.
---

# Championship MTG — Torneio

Detail docs: `docs/torneio.md`. Pairing helpers: `src/dominio/torneio/swiss.ts`.

## Status machine

`inscricoes_abertas` → `em_andamento` → `finalizado`

- Edit while open: `podeGerenciarTorneio`.
- While `em_andamento`, block changing `formato`, `maxJogadores`, `maxRodadas`, `corteTop`.
- After `finalizado`, only **global admin** edits (premiação etc.). Owner/host cannot.
- Delete only when `inscricoes_abertas` (and manager).
## Permissions

`podeGerenciarTorneio(torneio, usuarioId, isAdmin)`:

- Global admin
- Owner (`donoId`)
- Host (`anfitriaoId`)

Use this helper — never `donoId === usuarioId` alone.

## Swiss

- Rounds: `ceil(log2(n))`, optional `maxRodadas` cap
- Tiebreakers (WotC order): points → OMW% → GW% → OGW%
- Odd players: bye to lowest standing
- Pairing avoids rematches with backtracking; rematch only if unavoidable
- Top cut via `corteTop`

## Player flows

- Inscription requires profile `nickMTGO`
- Check-in: 1h before `horario` and between rounds when required
- Self-drop: empty body on `POST .../drop` (or own `jogadorId`)
  - Open: remove inscription
  - In progress: mark dropped + resolve pending matches WO
- Late join: generate link → `POST /torneio/ingressar/:token` with `{ deckId }`

## Results

Players report → opponent confirms / contests → organizer can adjust. Mesa updates and pairing edits are organizer paths.

## Realtime (Ably)

Publish after successful write. Channel `torneio-{torneioId}`. Keep event **names** stable — front handlers depend on them:

```
rodada_iniciada, torneio_iniciado, torneio_finalizado,
resultado_registrado, resultado_confirmado, resultado_contestado, resultado_ajustado,
participante_inscrito, checkin_realizado, deck_inserido,
jogador_dropou, jogador_ingressou, corte_iniciado,
rodada_refeita, total_rodadas_alterado, torneio_atualizado, jogador_voltou
```

Without `ABLY_API_KEY`, emits still happen but nothing is published. Confirm new event names in `notificacaoAbly.ts` before the front listens for them.

## Persistence coordination

Starting a tournament / next round: reconcile matches per round via `partidaGateway.reconciliarRodada`, then update tournament. Do not resurrect `atualizarECriarPartidas` on the tournament repository.

## Secrets / listing

`secreto` tournaments are omitted from public lists but reachable by direct id/slug. Share SEO: `GET /torneio/:id/seo` + HTML share routes for Amplify proxy.
