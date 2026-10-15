# Mapa E2E — Campeonato multi-dia

Fonte de verdade executável: `support/personasCampeonato.ts`.
Suite: `fluxoCampeonatoMultiDia.e2e.test.ts` (`npm run test:e2e:campeonato-multidia`).

## Máquina de estados coberta

```
inscricoes_abertas
  → em_andamento (Day 1, R1–R2)
  → pausado (POST /encerrar-day1)
  → em_andamento (Day 2, R3–R4)
  → finalizado
```

Guardrails assertidos:

- `proxima-rodada` na última rodada do Day 1 **sem** `encerrar-day1` → 400
- Resultados com status `pausado` → 400
- Após corte: 4 classificados (`avancaDay2`) e 4 `droppedRodada=2`

## Personas

Ver tabela em `docs/testes.md` (seção “E2E multi-dia e personas”).

## Cobertura por persona × ação

| Persona | Inscreve | Check-in | Reporta | Confirma | Contesta | É cortada | Campeã |
|---|---|---|---|---|---|---|---|
| Org | — | — | (ajuste) | — | — | — | — |
| Ana | ✓ | ✓ | R1–R2,R4 | ✓ | R3 (contra Diego) | | ✓ |
| Bruno | ✓ | ✓ | R1–R4 | ✓ | | | |
| Carla | ✓ | ✓ | R1–R2 (empate R3) | ✓ | | | |
| Diego | ✓ | ✓ | R1–R2, R3 errado, R4 | ✓ | | | |
| Elena/Fábio/Gabi/Hugo | ✓ | Day 1 | | ✓ | | ✓ | |

## Pontos esperados

- Pós Day 1: favoritos **6**, cortes **0**
- Pós Day 2: Ana **12**, Diego **9**, Bruno **7**, Carla **7**
