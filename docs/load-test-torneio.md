# Proposta de teste de carga — torneio (~300 usuários)

## Objetivo

Reproduzir o perfil de tráfego de um torneio real (não bombardear um endpoint isolado).

## Cenários progressivos

| Usuários | Objetivo |
|---|---|
| 50 | Baseline |
| 100 | Warm-up |
| 200 | Pico moderado |
| 300 | Meta atual |
| 500 | Stress |

## Mix de ações (por usuário / minuto)

Perfil sugerido durante rodada em andamento:

| Ação | Freq. | Endpoint |
|---|---|---|
| Abrir torneio | 1× no início | `GET /torneio/:id` |
| Standings | 2–4×/min (só após eventos Ably ou polling lento) | `GET /torneio/:id/standings` |
| Partidas | 2–4×/min | `GET /torneio/:id/partidas` |
| Registrar resultado | ~1× por rodada (jogadores da mesa) | `POST /torneio/partida/:id/resultado` |
| Próxima rodada | 1× (apenas dono/anfitrião) | `POST /torneio/:id/proxima-rodada` |
| Check-in | 1× por rodada | `POST /torneio/:id/checkin` |

**Evitar:** polling de standings a cada 2s (gera tempestade). Preferir Ably + refetch sob demanda.

## Ferramentas

- k6 ou Artillery com stages 50→500
- Scripts autenticados (login → JWT → ações)
- Seed de torneio com N inscritos em homolog

## Métricas AWS Lambda

- ConcurrentExecutions
- Duration (p50/p95/p99)
- Errors
- Throttles
- IteratorAge (N/A se só HTTP)

## Métricas MongoDB Atlas

- Connections / Connection %
- CPU
- Ops/sec
- Query latency
- Query targeting (scanned/returned)

## Critérios de sucesso (sugestão)

- p95 `GET /standings` < 300ms
- p95 `POST /resultado` < 500ms
- p95 `POST /proxima-rodada` < 3s (300 jogadores)
- Erros 5xx < 0,1%
- Sem throttling Lambda com reservedConcurrency proposto
- Connection % Atlas < 70% no pico

## Próximo gargalo provável (300 → 1000)

1. Conexões MongoDB sob concorrência Lambda alta  
2. Duração de `proxima-rodada` (pareamento + write de partidas)  
3. Fan-out Ably em picos de `resultado_registrado`  
4. Necessidade de processamento assíncrono (SQS) só se p95 de avanço de rodada passar de ~5–10s
