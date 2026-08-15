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
  premio?: string;
  maxJogadores?: number;
  secreto?: boolean;
  anfitriaoId?: string | null;
  rodadaIniciadaEm?: Date;
  criadoEm?: Date;
}
```

| Campo         | Tipo    | Descrição                                                 |
| ------------- | ------- | --------------------------------------------------------- |
| id            | string  | Identificador único UUID                                  |
| nome          | string  | Nome do torneio                                           |
| horario       | Date    | Data e hora de realização (**serializado em horário de Brasília, UTC-3**) |
| formato       | string  | Formato do torneio (Standard, Modern, Legacy, etc.)       |
| donoId        | string  | ID do usuário que criou o torneio                         |
| anfitriaoId   | string  | ID do usuário anfitrião (opcional; definido por admin)   |
| status        | string  | `inscricoes_abertas` → `em_andamento` → `finalizado`      |
| rodadaAtual   | number  | Rodada corrente (0 antes de iniciar)                      |
| totalRodadas  | number  | Total de rodadas calculado via `ceil(log₂(n))` ao iniciar |
| rodadaIniciadaEm | Date | Momento em que a rodada atual foi iniciada (timer; Brasília) |
| premio        | string  | Descrição do prêmio (opcional)                            |
| maxJogadores  | number  | Limite máximo de inscrições. Sem limite quando omitido (opcional) |
| secreto       | boolean | Se `true`, o torneio não aparece em listagens públicas. Acessível apenas por link direto com o UUID. Padrão: `false`. |

### Permissões de gerenciamento

Operações administrativas do torneio (iniciar rodada, registrar resultado em nome de jogador, ajustar pareamentos, etc.) podem ser executadas por:

- **Dono** do torneio (`donoId`)
- **Admin** global (`role: "admin"`)
- **Anfitrião** do torneio (`anfitriaoId`), definido via `PUT /torneio/:torneioId/anfitriao`

### Fuso horário (Brasília)

- Campos de data/hora (`horario`, `criadoEm`, `rodadaIniciadaEm`) são **serializados com offset `-03:00`** nas respostas da API.
- Ao criar ou alterar torneio, envie `horario` como string `datetime-local` ou ISO **sem converter para UTC no cliente** — o backend interpreta valores sem fuso como horário de Brasília.
- Exemplo: `"2026-03-20T19:00:00-03:00"` representa 19h em Brasília.

### Inscrição

```typescript
interface InscricaoProps {
  id: string;
  torneioId: string;
  usuarioId: string;
  deckId?: string;
  checkInRodada: number; // -1 = sem check-in, 0 = check-in inicial, N = check-in da rodada N
  dropped: boolean;
  criadoEm?: Date;
}
```

### Partida

```typescript
interface PartidaProps {
  id: string;
  torneioId: string;
  rodada: number;
  jogador1Id: string;
  jogador1Nome?: string;
  jogador1Excluido?: boolean;
  jogador2Id: string | null; // null = bye
  jogador2Nome?: string | null;
  jogador2Excluido?: boolean;
  deckJogador1Id?: string;
  deckJogador2Id?: string | null;
  vitoriasJogador1: number;
  vitoriasJogador2: number;
  status: "pendente" | "finalizada";
  contestado: boolean; // true quando um jogador ou dono solicita revisão do resultado
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

1. **Admin** cria o torneio (`POST /torneio/criar`) — requer role `"admin"`
2. **Jogadores** se inscrevem (`POST /torneio/:id/inscrever`)
3. **Jogadores** escolhem o deck a qualquer momento (`POST /torneio/:id/deck`)
4. **Jogadores** fazem check-in — disponível **1 hora antes** do `horario` do torneio (`POST /torneio/:id/checkin`)
5. **Dono** inicia o torneio — rodada 1 gerada com sorteio aleatório (`POST /torneio/:id/iniciar`)
6. **Jogadores / Dono** registram resultados (`POST /torneio/partida/:id/resultado`)
7. Jogadores que quiserem continuar fazem **check-in entre rodadas** (`POST /torneio/:id/checkin`), exceto quando a rodada atual já é a última do torneio
8. **Dono** avança para a próxima rodada — gera pareamentos Swiss ou finaliza (`POST /torneio/:id/proxima-rodada`)
9. Jogador pode **dropar a si mesmo**; organizador (dono/admin/anfitrião) pode dropar outro (`POST /torneio/:id/drop`)
10. Partidas (mesas) do torneio disponíveis a qualquer momento (`GET /torneio/:id/partidas` e filtro por rodada)
11. Standings disponíveis a qualquer momento (`GET /torneio/:id/standings`); contas excluídas aparecem como `"Usuário excluído"` com `excluido: true`

---

## Sistema Swiss

### Número de Rodadas

```
totalRodadas = ceil(log₂(n))
```

Onde `n` = número de jogadores com check-in.

Se `maxRodadas` estiver configurado no torneio, ele funciona como um teto:

```
totalRodadas = min(ceil(log₂(n)), maxRodadas)
```

Ou seja, `maxRodadas` nunca aumenta a quantidade padrão de rodadas; apenas impede que ela ultrapasse o limite definido.

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

### Rematch

O pareamento Swiss evita repetir oponentes (backtracking). Rematch só ocorre se não existir nenhum pareamento completo sem repetir.

---

## Endpoints

> **⚠️ Todos os endpoints de torneio requerem autenticação via token JWT.**

Entrada validada com **Zod** (`src/helpers/validacao/schemas.ts`): params UUID, body e query conforme cada rota. Erros retornam `400` com `{ mensagem, erros[] }`.

---

### POST /torneio/criar

Cria um novo torneio.

> **🔒 Requer role `admin`.** Além do token JWT, o usuário deve ter a role `"admin"`. Retorna `403` caso contrário.

**Request Body:**

```json
{
  "nome": "FNM Standard",
  "horario": "2026-03-20T19:00:00-03:00",
  "formato": "standard",
  "premio": "1º lugar: booster box",
  "maxJogadores": 32,
  "secreto": false
}
```

> `premio`, `maxJogadores` e `secreto` são opcionais. Quando `maxJogadores` é omitido, o torneio não tem limite de inscrições. Quando `secreto` é `true`, o torneio não aparece em listagens públicas — somente acessível via link direto com o UUID.

**Response (201):**

```json
{
  "id": "uuid",
  "nome": "FNM Standard",
  "horario": "2026-03-20T19:00:00-03:00",
  "formato": "standard",
  "donoId": "uuid-do-usuario",
  "status": "inscricoes_abertas",
  "secreto": false,
  "premio": "1º lugar: booster box",
  "criadoEm": "2026-03-13T10:00:00.000Z"
}
```

---

### GET /torneio/listar

**Filtros por data:** este endpoint aceita `dataInicio` e `dataFim` como query params para filtrar torneios pelo campo `horario`, ou seja, pela data/hora em que o torneio ira comecar. Os valores podem ser enviados como ISO completo (`2026-04-01T10:00:00.000Z`) ou apenas data (`2026-04-01`). Quando enviado apenas `YYYY-MM-DD`, `dataInicio` usa o comeco do dia (`00:00:00.000Z`) e `dataFim` usa o fim do dia (`23:59:59.999Z`).

Exemplos:

```http
GET /torneio/listar?dataInicio=2026-04-01&dataFim=2026-04-30
GET /torneio/listar?dataInicio=2026-04-01T10:00:00.000Z&dataFim=2026-04-30T23:00:00.000Z
```

Erros de validacao:

- `400` - `dataInicio` ou `dataFim` invalida
- `400` - `dataInicio` maior que `dataFim`

Lista todos os torneios existentes, ordenados por data de criação (mais recente primeiro).

> **Torneios secretos (`secreto: true`) são automaticamente excluídos desta listagem.** Para acessar um torneio secreto, utilize `GET /torneio/:torneioId` diretamente com o UUID.

**Response (200):**

```json
{
  "torneios": [
    {
      "id": "uuid",
      "nome": "FNM Standard",
      "horario": "2026-03-20T19:00:00-03:00",
      "formato": "standard",
      "donoId": "uuid",
      "status": "inscricoes_abertas",
      "rodadaAtual": 0,
      "totalRodadas": 0,
      "premio": "1º lugar: booster box",
      "criadoEm": "2026-03-13T10:00:00.000Z"
    }
  ]
}
```

---

### GET /torneio/:torneioId

Retorna os dados completos de um torneio: informações gerais, contagem de inscritos/check-in e todas as partidas com nomes dos jogadores.

**Response (200):**

```json
{
  "id": "uuid",
  "nome": "FNM Standard",
  "horario": "2026-03-20T19:00:00-03:00",
  "formato": "standard",
  "donoId": "uuid",
  "anfitriaoId": "uuid-anfitriao",
  "anfitriao": { "id": "uuid-anfitriao", "nome": "Maria", "email": "maria@email.com" },
  "status": "em_andamento",
  "rodadaAtual": 2,
  "totalRodadas": 4,
  "rodadaIniciadaEm": "2026-03-20T20:15:00-03:00",
  "premio": "1º lugar: booster box",
  "totalInscritos": 12,
  "totalCheckin": 10,
  "criadoEm": "2026-03-13T10:00:00.000Z",
  "partidas": [
    {
      "id": "uuid",
      "rodada": 1,
      "jogador1Id": "uuid-j1",
      "jogador1Nome": "João Silva",
      "jogador2Id": "uuid-j2",
      "jogador2Nome": "Maria Santos",
      "vitoriasJogador1": 2,
      "vitoriasJogador2": 1,
      "status": "finalizada",
      "contestado": false
    },
    {
      "id": "uuid",
      "rodada": 2,
      "jogador1Id": "uuid-j3",
      "jogador1Nome": "Pedro Lima",
      "jogador2Id": null,
      "jogador2Nome": null,
      "vitoriasJogador1": 2,
      "vitoriasJogador2": 0,
      "status": "finalizada",
      "contestado": false
    }
  ]
}
```

| Campo          | Descrição                                                         |
| -------------- | ----------------------------------------------------------------- |
| anfitriaoId    | UUID do anfitrião (null se não definido)                          |
| anfitriao      | Objeto `{ id, nome, email }` quando há anfitrião                   |
| rodadaIniciadaEm | Início da rodada atual (Brasília); usado pelo timer             |
| totalInscritos | Total de jogadores inscritos no torneio                           |
| totalCheckin   | Total de jogadores que confirmaram presença (`checkIn = true`)    |
| partidas       | Todas as partidas do torneio ordenadas por rodada                 |
| jogador2Nome   | `null` quando a partida é um bye                                  |
| contestado     | `true` se o resultado da partida foi contestado e aguarda revisão |

---

### PUT /torneio/:torneioId

**(Somente dono ou admin)** Atualiza os dados de um torneio. Só pode ser feito enquanto o status for `inscricoes_abertas`. Apenas os campos enviados são atualizados.

**Request Body** _(todos os campos são opcionais)_:

```json
{
  "nome": "FNM Standard Semanal",
  "horario": "2026-03-27T19:00:00-03:00",
  "formato": "standard",
  "premio": "Booster Box",
  "maxJogadores": 64,
  "maxRodadas": 6,
  "corteTop": 8,
  "bannerUrl": "https://cdn.example.com/banner.png",
  "linkBanner": "https://evento.example.com",
  "somRodada": "https://cdn.example.com/som.mp3",
  "linkLive": "https://twitch.tv/example",
  "secreto": true
}
```

> Quando `secreto: true`, o torneio é removido das listagens públicas mas continua acessível diretamente pelo UUID.

**Response (200):** Retorna os dados completos atualizados do torneio (mesma estrutura de `POST /torneio/criar`).

**Erros:**

- `404` — Torneio não encontrado
- `403` — Não é dono nem admin
- `400` — Torneio não está em `inscricoes_abertas`

---

### PUT /torneio/:torneioId/anfitriao

**(Somente admin)** Define ou remove o anfitrião do torneio. O anfitrião recebe permissões de gerenciamento **neste torneio** (iniciar rodadas, ajustar resultados, pareamentos, etc.), equivalentes às do dono para operações in-game.

**Request Body:**

```json
{
  "anfitriaoId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Para remover o anfitrião:

```json
{
  "anfitriaoId": null
}
```

**Response (200):** Retorna o torneio atualizado com `anfitriaoId` e objeto `anfitriao` populado.

**Erros:**

- `403` — Usuário não é admin
- `404` — Torneio ou usuário anfitrião não encontrado

---

### GET /torneio/:torneioId/partidas

Retorna apenas as partidas do torneio informado, filtradas por `torneioId`.

Esse endpoint funciona com o torneio em qualquer status, incluindo `finalizado`, para permitir listar as mesas de rodadas anteriores no front.

Você pode filtrar por rodada com query string:

- `GET /torneio/:torneioId/partidas` → retorna todas as partidas do torneio
- `GET /torneio/:torneioId/partidas?rodada=2` → retorna apenas as mesas da rodada 2

**Response (200):**

```json
{
  "torneioId": "uuid",
  "rodada": 2,
  "partidas": [
    {
      "id": "uuid",
      "rodada": 1,
      "jogador1Id": "uuid-j1",
      "jogador1Nome": "João Silva",
      "jogador2Id": "uuid-j2",
      "jogador2Nome": "Maria Santos",
      "deckJogador1Id": "uuid-deck-j1",
      "deckJogador2Id": "uuid-deck-j2",
      "vitoriasJogador1": 2,
      "vitoriasJogador2": 1,
      "status": "finalizada",
      "contestado": false
    },
    {
      "id": "uuid",
      "rodada": 2,
      "jogador1Id": "uuid-j3",
      "jogador1Nome": "Pedro Lima",
      "jogador2Id": null,
      "jogador2Nome": null,
      "vitoriasJogador1": 2,
      "vitoriasJogador2": 0,
      "status": "finalizada",
      "contestado": false
    }
  ]
}
```

**Erros:**

- `404` — Torneio não encontrado
- `400` — Rodada inválida (deve ser inteiro >= 1)

---

### POST /torneio/:torneioId/inscrever

Inscreve o usuário autenticado no torneio. Só funciona enquanto `status = inscricoes_abertas`.

> O usuário deve ter o campo `nickMTGO` configurado no perfil para se inscrever.

**Response (201):**

```json
{
  "id": "uuid",
  "torneioId": "uuid",
  "usuario": {
    "id": "uuid",
    "nome": "João Silva"
  },
  "checkIn": false,
  "dropped": false,
  "criadoEm": "2026-03-13T10:05:00.000Z"
}
```

**Erros:**

- `404` — Torneio não encontrado
- `400` — Inscrições encerradas
- `400` — Usuário já inscrito
- `400` — Nick MTGO não configurado na conta
- `400` — Limite máximo de jogadores atingido (`maxJogadores`)

---

### POST /torneio/:torneioId/deck

Escolhe ou troca o deck para o torneio. Pode ser feito a qualquer momento enquanto o torneio não estiver `finalizado`. O jogador precisa estar inscrito.

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
  "usuario": {
    "id": "uuid",
    "nome": "João Silva"
  },
  "deckId": "uuid-do-deck"
}
```

**Erros:**

- `404` — Torneio ou deck não encontrado
- `403` — Deck pertence a outro usuário
- `400` — Torneio já finalizado
- `404` — Usuário não inscrito
- `400` — Formato do deck diferente do formato do torneio

---

### POST /torneio/:torneioId/checkin

Confirma presença no torneio ou em uma rodada específica. Nenhum body necessário.

| Contexto                  | Comportamento                                                                   |
| ------------------------- | ------------------------------------------------------------------------------- |
| `inscricoes_abertas`      | Aceito a partir de **1 hora antes** do `horario`. Seta `checkIn = true`.        |
| `em_andamento`            | Confirma para a próxima rodada. Sem check-in = excluído dos próximos pareamentos. Não é necessário quando a rodada atual já é a última e o próximo passo é apenas finalizar ou entrar no corte. |

**Response (200):**

```json
{
  "id": "uuid",
  "torneioId": "uuid",
  "usuario": {
    "id": "uuid",
    "nome": "João Silva"
  },
  "checkIn": true,
  "checkInRodada": 0
}
```

> `checkInRodada = 0` = check-in inicial. `checkInRodada = N` = confirmado para a rodada N+1.

**Erros:**

- `404` — Torneio não encontrado ou usuário não inscrito
- `400` — Check-in ainda não aberto (faltam mais de 1h)
- `400` — Torneio já finalizado

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
- `400` — Menos de 2 jogadores com check-in (ativos e não dropados)

---

### POST /torneio/:torneioId/drop

Dropa um jogador do torneio. O jogador dropado não participa dos próximos pareamentos, mas seus resultados anteriores são mantidos nos standings.

- **Jogador dropa a si mesmo**: chame sem body (ou `jogadorId` = próprio id). Em `inscricoes_abertas` a inscrição é removida; em `em_andamento` marca `dropped` e resolve partidas pendentes por WO
- **Organizador dropa outro jogador** (dono, admin ou anfitrião): envie `jogadorId` no body

**Request Body** _(somente ao dropar outro jogador)_:

```json
{
  "jogadorId": "uuid-do-jogador"
}
```

**Response (200):**

```json
{
  "inscricaoId": "uuid",
  "torneioId": "uuid",
  "jogador": {
    "id": "uuid",
    "nome": "João Silva"
  },
  "dropped": true
}
```

**Erros:**

- `404` — Torneio não encontrado ou jogador não inscrito
- `403` — Requisitante não é o jogador nem quem pode gerenciar o torneio
- `400` — Jogador já foi dropado
- `400` — Torneio já finalizado

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
  "jogador1Nome": "João Silva",
  "jogador2Id": "uuid",
  "jogador2Nome": "Maria Santos",
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
- `400` — Torneio não está em andamento
- `403` — Usuário não é jogador nem dono
- `400` — Resultado inválido (ex: 3-0, 2-2)

---

### POST /torneio/:torneioId/proxima-rodada

**(Somente dono)** Verifica se todas as partidas da rodada atual estão finalizadas e então:

- Se ainda há rodadas: gera os pareamentos Swiss e avança para a próxima rodada
- Se era a última rodada: finaliza o torneio e retorna a classificação final, sem exigir novo check-in

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
      "usuario": {
        "id": "uuid",
        "nome": "João Silva",
        "excluido": false
      },
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

Retorna a classificação atual do torneio com todas as estatísticas de desempate.

- Torneio em `inscricoes_abertas` (ou `rodadaAtual === 0`): retorna lista de inscritos com campos básicos e estatísticas zeradas.
- Torneio em `em_andamento` ou `finalizado`: retorna ranking ordenado pelo critério oficial WotC.

**Response (200) — antes do início:**

```json
{
  "torneioId": "uuid",
  "rodadaAtual": 0,
  "totalRodadas": 0,
  "status": "inscricoes_abertas",
  "standings": [
    {
      "posicao": 1,
      "usuario": {
        "id": "uuid",
        "nome": "João Silva",
        "excluido": false
      },
      "pontosMesa": 0,
      "vitoriasPartida": 0,
      "empatesPartida": 0,
      "derrotasPartida": 0,
      "mwp": 0,
      "omwp": 0,
      "gwp": 0,
      "ogwp": 0,
      "checkIn": true,
      "deckId": "uuid-do-deck",
      "deckNome": "Mono Red Aggro",
      "checkInProximaRodada": true,
      "dropped": false
    }
  ]
}
```

**Response (200) — durante o torneio:**

```json
{
  "torneioId": "uuid",
  "rodadaAtual": 2,
  "totalRodadas": 4,
  "status": "em_andamento",
  "standings": [
    {
      "posicao": 1,
      "usuario": {
        "id": "uuid",
        "nome": "João Silva",
        "excluido": false
      },
      "pontosMesa": 6,
      "vitoriasPartida": 2,
      "empatesPartida": 0,
      "derrotasPartida": 0,
      "mwp": 1.0,
      "omwp": 0.67,
      "gwp": 0.83,
      "ogwp": 0.61,
      "checkIn": true,
      "deckId": "uuid-do-deck",
      "deckNome": "Mono Red Aggro",
      "checkInProximaRodada": true,
      "dropped": false
    }
  ]
}
```

| Campo                | Descrição                                                                 |
| -------------------- | ------------------------------------------------------------------------- |
| usuario              | Objeto com `id` e `nome` do jogador                                       |
| deckNome             | Nome do deck escolhido (`null` se nenhum deck foi escolhido)              |
| mwp                  | Match Win Percentage                                                      |
| omwp                 | Opponent Match Win Percentage (mín. 33%)                                  |
| gwp                  | Game Win Percentage (mín. 33%)                                            |
| ogwp                 | Opponent Game Win Percentage (mín. 33%)                                   |
| checkInProximaRodada | `true` se o jogador fez check-in para a rodada em andamento/seguinte      |

**Erros:**

- `404` — Torneio não encontrado

---

### GET /torneio/:torneioId/meu-historico

Retorna todas as partidas do jogador autenticado nesse torneio, com resultado, oponente e placar de cada rodada.

**Response (200):**

```json
{
  "torneioId": "uuid",
  "usuario": {
    "id": "uuid",
    "nome": "João Silva"
  },
  "partidas": [
    {
      "id": "uuid",
      "rodada": 1,
      "oponente": {
        "id": "uuid-oponente",
        "nome": "Maria Santos"
      },
      "vitoriasJogador": 2,
      "vitoriasOponente": 1,
      "resultado": "vitoria",
      "status": "finalizada"
    },
    {
      "id": "uuid",
      "rodada": 2,
      "oponente": null,
      "vitoriasJogador": 2,
      "vitoriasOponente": 0,
      "resultado": "bye",
      "status": "finalizada"
    }
  ]
}
```

| Campo     | Valores possíveis                          |
| --------- | ------------------------------------------ |
| resultado | `vitoria`, `derrota`, `empate`, `bye`      |
| oponente  | Objeto `{ id, nome }` ou `null` no bye     |

**Erros:**

- `404` — Torneio não encontrado

---

### POST /torneio/partida/:partidaId/contestar

Marca uma partida finalizada como **contestada**, sinalizando ao dono/admin que o resultado precisa de revisão. O placar **não é alterado**. Pode ser feito pelos próprios jogadores da partida, pelo dono do torneio ou por um admin.

**Response (200):**

```json
{
  "id": "uuid",
  "torneioId": "uuid",
  "rodada": 2,
  "jogador1Id": "uuid-j1",
  "jogador2Id": "uuid-j2",
  "vitoriasJogador1": 2,
  "vitoriasJogador2": 0,
  "status": "finalizada",
  "contestado": true
}
```

**Erros:**

- `404` — Partida não encontrada
- `400` — Partida não está finalizada
- `400` — Torneio não está em andamento
- `403` — Usuário não é jogador, dono nem admin

---

### PUT /torneio/partida/:partidaId/ajustar

**(Somente dono ou admin)** Corrige o resultado de uma partida que esteja com `contestado: true`. Após o ajuste, a flag `contestado` é removida. Empates não são permitidos durante a fase de **corte**.

**Request Body:**

```json
{
  "vitoriasJogador1": 1,
  "vitoriasJogador2": 2
}
```

**Response (200):**

```json
{
  "id": "uuid",
  "torneioId": "uuid",
  "rodada": 2,
  "jogador1Id": "uuid-j1",
  "jogador2Id": "uuid-j2",
  "vitoriasJogador1": 1,
  "vitoriasJogador2": 2,
  "status": "finalizada",
  "contestado": false
}
```

**Erros:**

- `404` — Partida não encontrada
- `400` — Partida não está marcada como contestada
- `400` — Torneio não está em andamento
- `403` — Não é dono nem admin
- `400` — Placar inválido (máx. 2 vitórias por jogador, soma ≤ 3)
- `400` — Empate não permitido em fase de corte

---

### POST /torneio/:torneioId/gerar-link-ingresso

**(Somente dono ou admin)** Gera um token de uso único para permitir que um jogador entre no torneio enquanto ele está **em andamento**. O token expira em 24 horas por padrão.

**Request Body** _(opcional)_:

```json
{
  "validadeHoras": 12
}
```

**Response (201):**

```json
{
  "token": "uuid-do-token",
  "torneioId": "uuid",
  "expiresAt": "2026-03-21T10:00:00.000Z"
}
```

> Compartilhe o `token` com o jogador. O frontend deve montar a URL de ingresso como: `/torneio/ingressar/{token}`.

**Erros:**

- `404` — Torneio não encontrado
- `400` — Torneio não está em andamento
- `403` — Não é dono nem admin

---

### POST /torneio/ingressar/:token

Permite que o jogador autenticado ingresse em um torneio **em andamento** usando um token gerado pelo dono. O token é de **uso único** — é consumido imediatamente após o ingresso.

**Request Body:**

```json
{
  "deckId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Comportamento após o ingresso:**

| Situação na rodada atual                     | Resultado para o novo jogador                              |
| -------------------------------------------- | ---------------------------------------------------------- |
| Existe jogador aguardando BYE                | O novo jogador substitui o BYE. O adversário original mantém sua vitória 2-0. |
| Não há jogador com BYE disponível            | Nova partida criada com derrota 0-2 para o novo jogador (penalidade por entrada tardia). |

**Response (200):**

```json
{
  "inscricaoId": "uuid",
  "torneioId": "uuid",
  "usuarioId": "uuid",
  "partidaId": "uuid",
  "rodada": 3,
  "vitoriasJogador1": 0,
  "vitoriasJogador2": 2
}
```

**Erros:**

- `404` — Token inválido ou expirado
- `400` — Link de ingresso expirado
- `400` — Torneio não está em andamento
- `404` — Usuário não encontrado
- `400` — Nick MTGO não configurado na conta
- `400` — `deckId` inválido ou ausente
- `400` — Usuário já está inscrito neste torneio

---

## Erros Comuns

| Código | Situação                                          |
| ------ | ------------------------------------------------- |
| 400    | Torneio em status incompatível com a operação     |
| 400    | Check-in antes da janela de 1h                    |
| 400    | Resultado de partida inválido                     |
| 400    | Partidas pendentes ao tentar avançar a rodada     |
| 400    | Jogador já dropado                                |
| 400    | Nick MTGO não configurado ao tentar se inscrever  |
| 400    | Limite máximo de jogadores atingido               |
| 400    | Formato do deck diferente do formato do torneio   |
| 400    | Partida não está marcada como contestada          |
| 400    | Link de ingresso inválido ou expirado             |
| 403    | Tentativa de operação exclusiva do dono           |
| 403    | Deck pertence a outro usuário                     |
| 403    | Drop de outro jogador sem ser o dono              |
| 404    | Torneio, partida ou deck não encontrado           |

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

| Evento                   | Disparado quando                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `rodada_iniciada`        | `POST /torneio/:id/iniciar` ou `POST /torneio/:id/proxima-rodada` (torneio não finalizado) |
| `torneio_finalizado`     | `POST /torneio/:id/proxima-rodada` quando última rodada encerra                            |
| `resultado_registrado`   | `POST /torneio/partida/:id/resultado`                                                      |
| `participante_inscrito`  | `POST /torneio/:id/inscrever` — novo jogador inscrito                                      |
| `checkin_realizado`      | `POST /torneio/:id/checkin` — jogador confirmou presença                                   |
| `deck_inserido`          | `POST /torneio/:id/deck` — jogador escolheu ou trocou o deck                               |

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
  "jogador1Nome": "João Silva",
  "jogador2Id": "...",
  "jogador2Nome": "Maria Santos",
  "vitoriasJogador1": 2,
  "vitoriasJogador2": 1,
  "status": "finalizada"
}
```

**`torneio_finalizado`**

```json
{
  "torneioId": "abc123",
  "classificacao": [
    {
      "posicao": 1,
      "usuario": {
        "id": "...",
        "nome": "João Silva"
      },
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
canal.subscribe("torneio_finalizado", (msg) => console.log(msg.data));
canal.subscribe("participante_inscrito", (msg) => console.log(msg.data));
canal.subscribe("checkin_realizado", (msg) => console.log(msg.data));
```

> No Lambda (produção), a variável `ABLY_API_KEY` deve ser configurada nas variáveis de ambiente da função no console da AWS ou via `serverless.yaml`.
