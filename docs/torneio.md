# Entidade: Torneio

## Descrição

Sistema completo de gerenciamento de torneios de Magic: The Gathering com sistema de pareamento **Swiss** e critérios de desempate oficiais da WotC.

---

## Estrutura das Entidades

### Torneio

```typescript
interface TorneioProps {
  id: string;
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
  status: "inscricoes_abertas" | "em_andamento" | "finalizado";
  rodadaAtual: number;
  totalRodadas: number;
  criadoEm?: Date;
}
```

| Campo        | Tipo   | Descrição                                                 |
| ------------ | ------ | --------------------------------------------------------- |
| id           | string | Identificador único UUID                                  |
| nome         | string | Nome do torneio                                           |
| horario      | Date   | Data e hora de realização                                 |
| formato      | string | Formato do torneio (Standard, Modern, Legacy, etc.)       |
| donoId       | string | ID do usuário que criou o torneio                         |
| status       | string | `inscricoes_abertas` → `em_andamento` → `finalizado`      |
| rodadaAtual  | number | Rodada corrente (0 antes de iniciar)                      |
| totalRodadas | number | Total de rodadas calculado via `ceil(log₂(n))` ao iniciar |

### Inscrição

```typescript
interface InscricaoProps {
  id: string;
  torneioId: string;
  usuarioId: string;
  deckId?: string; // definido no check-in
  checkIn: boolean;
}
```

### Partida

```typescript
interface PartidaProps {
  id: string;
  torneioId: string;
  rodada: number;
  jogador1Id: string;
  jogador2Id: string | null; // null = bye
  deckJogador1Id?: string;
  deckJogador2Id?: string | null;
  vitoriasJogador1: number;
  vitoriasJogador2: number;
  status: "pendente" | "finalizada";
}
```

Resultados válidos **(Best-of-3)**: `2-0`, `2-1`, `1-0`, `1-1`, `0-0`.  
Máximo 2 vitórias por jogador. Máximo 3 jogos totais.

---

## Fluxo do Torneio

```
[Criação] → [Inscrições] → [Check-in + deck] → [Iniciar]
                                                    ↓
                                            [Rodada gerada]
                                                    ↓
                                         [Registrar resultados]
                                                    ↓
                                       [Próxima rodada / Finalizar]
```

1. **Dono** cria o torneio (`POST /torneio/criar`)
2. **Jogadores** se inscrevem (`POST /torneio/:id/inscrever`)
3. **Jogadores** fazem check-in com um deck (`POST /torneio/:id/checkin`)
4. **Dono** inicia o torneio — rodada 1 gerada com sorteio aleatório (`POST /torneio/:id/iniciar`)
5. **Jogadores / Dono** registram resultados (`POST /torneio/partida/:id/resultado`)
6. **Dono** avança para a próxima rodada — gera pareamentos Swiss ou finaliza (`POST /torneio/:id/proxima-rodada`)
7. Standings disponíveis a qualquer momento (`GET /torneio/:id/standings`)

---

## Sistema Swiss

### Número de Rodadas

```
totalRodadas = ceil(log₂(n))
```

Onde `n` = número de jogadores com check-in.

| Jogadores | Rodadas |
| --------- | ------- |
| 2–2       | 1       |
| 3–4       | 2       |
| 5–8       | 3       |
| 9–16      | 4       |
| 17–32     | 5       |

### Pontuação

| Resultado da partida | Pontos |
| -------------------- | ------ |
| Vitória              | 3 pts  |
| Empate               | 1 pt   |
| Derrota              | 0 pts  |

### Critérios de Desempate (ordem oficial WotC)

1. **Pontos de mesa** (match points)
2. **OMW%** — Opponent Match Win Percentage (mín. 33%)
3. **GW%** — Game Win Percentage (mín. 33%)
4. **OGW%** — Opponent Game Win Percentage (mín. 33%)

### Byes

Quando há número ímpar de jogadores, o último colocado no ranking recebe um **bye** (vitória automática 2-0). Byes não são contabilizados no cálculo de OMW%/OGW% dos oponentes.

---

## Endpoints

> **⚠️ Todos os endpoints de torneio requerem autenticação via token JWT.**

---

### POST /torneio/criar

Cria um novo torneio.

**Request Body:**

```json
{
  "nome": "FNM Standard",
  "horario": "2026-03-20T19:00:00.000Z",
  "formato": "standard"
}
```

**Response (201):**

```json
{
  "id": "uuid",
  "nome": "FNM Standard",
  "horario": "2026-03-20T19:00:00.000Z",
  "formato": "standard",
  "donoId": "uuid-do-usuario",
  "status": "inscricoes_abertas",
  "criadoEm": "2026-03-13T10:00:00.000Z"
}
```

---

### GET /torneio/listar

Lista todos os torneios existentes, ordenados por data de criação (mais recente primeiro).

**Response (200):**

```json
{
  "torneios": [
    {
      "id": "uuid",
      "nome": "FNM Standard",
      "horario": "2026-03-20T19:00:00.000Z",
      "formato": "standard",
      "donoId": "uuid",
      "status": "inscricoes_abertas",
      "rodadaAtual": 0,
      "totalRodadas": 0,
      "criadoEm": "2026-03-13T10:00:00.000Z"
    }
  ]
}
```

---

### GET /torneio/:torneioId

Retorna os dados de um torneio específico.

**Response (200):**

```json
{
  "id": "uuid",
  "nome": "FNM Standard",
  "horario": "2026-03-20T19:00:00.000Z",
  "formato": "standard",
  "donoId": "uuid",
  "status": "em_andamento",
  "rodadaAtual": 2,
  "totalRodadas": 4,
  "criadoEm": "2026-03-13T10:00:00.000Z"
}
```

---

### POST /torneio/:torneioId/inscrever

Inscreve o usuário autenticado no torneio. Só funciona enquanto `status = inscricoes_abertas`.

**Response (201):**

```json
{
  "id": "uuid",
  "torneioId": "uuid",
  "usuarioId": "uuid",
  "checkIn": false,
  "criadoEm": "2026-03-13T10:05:00.000Z"
}
```

**Erros:**

- `404` — Torneio não encontrado
- `400` — Inscrições encerradas
- `400` — Usuário já inscrito

---

### POST /torneio/:torneioId/checkin

Confirma presença e registra o deck a ser usado. Só funciona enquanto `status = inscricoes_abertas`.

**Request Body:**

```json
{
  "deckId": "uuid-do-deck"
}
```

**Response (200):**

```json
{
  "id": "uuid",
  "torneioId": "uuid",
  "usuarioId": "uuid",
  "deckId": "uuid-do-deck",
  "checkIn": true
}
```

**Erros:**

- `404` — Torneio ou deck não encontrado
- `403` — Deck pertence a outro usuário
- `400` — Torneio já iniciado
- `404` — Usuário não inscrito

---

### POST /torneio/:torneioId/iniciar

**(Somente dono)** Inicia o torneio e gera os pareamentos da rodada 1 por sorteio aleatório. Exige mínimo de 2 jogadores com check-in.

**Response (200):**

```json
{
  "torneioId": "uuid",
  "rodadaAtual": 1,
  "totalRodadas": 4,
  "partidas": [
    {
      "id": "uuid",
      "jogador1Id": "uuid-j1",
      "jogador2Id": "uuid-j2",
      "deckJogador1Id": "uuid-deck1",
      "deckJogador2Id": "uuid-deck2"
    },
    {
      "id": "uuid",
      "jogador1Id": "uuid-j3",
      "jogador2Id": null,
      "deckJogador1Id": "uuid-deck3",
      "deckJogador2Id": null
    }
  ]
}
```

**Erros:**

- `403` — Não é o dono
- `400` — Torneio já iniciado/finalizado
- `400` — Menos de 2 jogadores com check-in

---

### POST /torneio/partida/:partidaId/resultado

Registra o resultado de uma partida BO3. Pode ser feito pelos jogadores da partida ou pelo dono do torneio.

**Request Body:**

```json
{
  "vitoriasJogador1": 2,
  "vitoriasJogador2": 1
}
```

Exemplos válidos: `2-0`, `2-1`, `1-2`, `0-2`, `1-0`, `0-1`, `1-1`, `0-0`.

**Response (200):**

```json
{
  "id": "uuid",
  "torneioId": "uuid",
  "rodada": 1,
  "jogador1Id": "uuid",
  "jogador2Id": "uuid",
  "deckJogador1Id": "uuid",
  "deckJogador2Id": "uuid",
  "vitoriasJogador1": 2,
  "vitoriasJogador2": 1,
  "status": "finalizada"
}
```

**Erros:**

- `404` — Partida não encontrada
- `400` — Partida já finalizada
- `403` — Usuário não é jogador nem dono
- `400` — Resultado inválido (ex: 3-0, 2-2)

---

### POST /torneio/:torneioId/proxima-rodada

**(Somente dono)** Verifica se todas as partidas da rodada atual estão finalizadas e então:

- Se ainda há rodadas: gera os pareamentos Swiss e avança para a próxima rodada
- Se era a última rodada: finaliza o torneio e retorna a classificação final

**Response quando há próxima rodada (200):**

```json
{
  "finalizado": false,
  "rodadaAtual": 2,
  "partidas": [
    {
      "id": "uuid",
      "jogador1Id": "uuid",
      "jogador2Id": "uuid",
      "deckJogador1Id": "uuid",
      "deckJogador2Id": "uuid"
    }
  ]
}
```

**Response quando torneio finaliza (200):**

```json
{
  "finalizado": true,
  "classificacao": [
    {
      "posicao": 1,
      "usuarioId": "uuid",
      "pontosMesa": 12,
      "omwp": 0.72,
      "gwp": 0.85,
      "ogwp": 0.65
    }
  ]
}
```

**Erros:**

- `403` — Não é o dono
- `400` — Torneio não está em andamento
- `400` — Há partidas pendentes na rodada atual

---

### GET /torneio/:torneioId/standings

Retorna a classificação atual do torneio com todas as estatísticas de desempate. Disponível enquanto `em_andamento` ou `finalizado`.

**Response (200):**

```json
{
  "torneioId": "uuid",
  "rodadaAtual": 2,
  "totalRodadas": 4,
  "status": "em_andamento",
  "standings": [
    {
      "posicao": 1,
      "usuarioId": "uuid",
      "pontosMesa": 6,
      "vitoriasPartida": 2,
      "empatesPartida": 0,
      "derrotasPartida": 0,
      "mwp": 1.0,
      "omwp": 0.67,
      "gwp": 0.83,
      "ogwp": 0.61
    },
    {
      "posicao": 2,
      "usuarioId": "uuid",
      "pontosMesa": 6,
      "vitoriasPartida": 2,
      "empatesPartida": 0,
      "derrotasPartida": 0,
      "mwp": 1.0,
      "omwp": 0.61,
      "gwp": 0.75,
      "ogwp": 0.58
    }
  ]
}
```

**Erros:**

- `404` — Torneio não encontrado
- `400` — Torneio ainda não iniciado

---

## Erros Comuns

| Código | Situação                                      |
| ------ | --------------------------------------------- |
| 400    | Torneio em status incompatível com a operação |
| 400    | Resultado de partida inválido                 |
| 400    | Partidas pendentes ao tentar avançar a rodada |
| 403    | Tentativa de operação exclusiva do dono       |
| 403    | Deck pertence a outro usuário                 |
| 404    | Torneio, partida ou deck não encontrado       |

---

## Notificações em Tempo Real (Ably)

O servidor publica eventos via **Ably Pub/Sub** sempre que algo relevante acontece no torneio. O cliente assina o canal do torneio para receber atualizações automaticamente.

### Variáveis de ambiente necessárias

| Variável               | Onde usar                  | Descrição                        |
| ---------------------- | -------------------------- | -------------------------------- |
| `ABLY_API_KEY`         | Servidor (`.env` / Lambda) | Chave Root — publica eventos     |
| Chave _Subscribe only_ | Frontend                   | Só recebe eventos, nunca publica |

### Canal

Cada torneio tem um canal exclusivo:

```
torneio-{torneioId}
```

### Eventos emitidos

| Evento                  | Disparado quando                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `rodada_iniciada`       | `POST /torneio/:id/iniciar` ou `POST /torneio/:id/proxima-rodada` (torneio não finalizado) |
| `torneio_finalizado`    | `POST /torneio/:id/proxima-rodada` quando última rodada encerra                            |
| `resultado_registrado`  | `POST /torneio/partida/:id/resultado`                                                      |
| `standings_atualizados` | Imediatamente após `resultado_registrado` com standings recalculados                       |

### Payload dos eventos

**`rodada_iniciada`**

```json
{
  "torneioId": "abc123",
  "rodadaAtual": 2,
  "totalRodadas": 4,
  "partidas": [{ "id": "...", "jogador1Id": "...", "jogador2Id": "..." }]
}
```

**`resultado_registrado`**

```json
{
  "id": "...",
  "torneioId": "abc123",
  "rodada": 2,
  "jogador1Id": "...",
  "jogador2Id": "...",
  "vitoriasJogador1": 2,
  "vitoriasJogador2": 1,
  "status": "finalizada"
}
```

**`standings_atualizados`** — mesmo payload do `GET /torneio/:id/standings`

**`torneio_finalizado`**

```json
{
  "torneioId": "abc123",
  "classificacao": [
    {
      "posicao": 1,
      "usuarioId": "...",
      "pontosMesa": 9,
      "omwp": 0.67,
      "gwp": 0.72,
      "ogwp": 0.61
    }
  ]
}
```

### Integração no frontend (ably-js)

```typescript
import Ably from "ably";

const ably = new Ably.Realtime("SUA_SUBSCRIBE_ONLY_KEY");
const canal = ably.channels.get(`torneio-${torneioId}`);

canal.subscribe("rodada_iniciada", (msg) => console.log(msg.data));
canal.subscribe("resultado_registrado", (msg) => console.log(msg.data));
canal.subscribe("standings_atualizados", (msg) => console.log(msg.data));
canal.subscribe("torneio_finalizado", (msg) => console.log(msg.data));
```

> No Lambda (produção), a variável `ABLY_API_KEY` deve ser configurada nas variáveis de ambiente da função no console da AWS ou via `serverless.yaml`.
