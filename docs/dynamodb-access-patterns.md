# Access patterns — DynamoDB

A tabela de dados é single-table (`pk` / `sk`). Não há GSI. Cada padrão abaixo diz qual chave a query usa hoje e o que ainda é filtrado no Node.

Leituras de catálogo público usam consistência eventual. `GetItem` e `BatchGetItem` continuam com `ConsistentRead`, porque o mesmo `buscarPorId` serve o comando (resultado, rodada, finalização) e a tela de detalhe.

## Torneio

| ID | Acesso | Chave | Observação |
|---|---|---|---|
| AP01 | Buscar por id | `pk = TORNEIO#id`, `sk = METADATA` | Consistente |
| AP02 | Listar por horário | `pk = TORNEIOS`, `sk` entre `TORNEIO#inicio` e `TORNEIO#fim` | `sk` já é `TORNEIO#horario#id`. Sem data, a partição inteira ainda é lida |
| AP03 | Listar por dono | `pk = DONO#id` | Contagem do limite de torneios. Consistente |
| AP04 | Listar por anfitrião | `pk = ANFITRIAO#id` | Consistente |
| AP05 | Listar por status, nome ou secreto | `pk = TORNEIOS` e filtro no Node | Ainda não tem chave própria |
| AP06 | Buscar por prefixo de id | `pk = TORNEIOS` e filtro no Node | Link curto. Eventual |

Paginação da API continua `offset` + `limite` depois da query. Cursor com `LastEvaluatedKey` só passa a valer quando AP05 deixar de varrer a partição.

## Partida

| ID | Acesso | Chave |
|---|---|---|
| AP07 | Partidas do torneio | `pk = TORNEIO#id` |
| AP08 | Partidas da rodada | `pk = TORNEIO#id#RODADA#n` |
| AP09 | Partida por id | `pk = PARTIDA#id`, `sk = DATA` |
| AP10 | Partidas de um deck | `pk = DECK#id` |

AP07 ainda filtra o jogador no Node (`listarPorJogadorETorneio`).

## O que esta passagem não muda

Status, nome e secreto de torneio continuam em memória. Um índice `STATUS#valor` exigiria item novo e backfill. Dono, anfitrião e intervalo de horário já têm chave e são as queries que deixam de depender só do filtro em memória.
