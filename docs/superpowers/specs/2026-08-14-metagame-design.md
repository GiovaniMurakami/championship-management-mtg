# Metagame por formato (estilo MTGGoldfish)

Data: 2026-08-14  
Repositórios: `championship-management-mtg` (API) + `championship-management-mtg-front` (SPA)

## Objetivo

Página pública de metagame que agrega decks e resultados de **torneios finalizados** do site, por **formato**, numa janela de dias. Visual e fluxo próximos ao [MTGGoldfish Metagame](https://www.mtggoldfish.com/metagame/pauper#paper) e à [página de arquétipo](https://www.mtggoldfish.com/archetype/pauper-blue-terror-2b4f6710-ccb2-4660-b5f9-ea85c8875ec5#paper): lista com meta %, carta representativa, listas acumuladas, matchups e resultados em torneios.

## Fora de escopo

- Metagame filtrado por liga (pode ser filtro futuro)
- Cadastro manual de arquétipos (admin já consolida `nomeConsolidado`)
- Clustering por cartas-chave
- Snapshot/job no Mongo (agregação na leitura)
- Provisioned concurrency / mudanças de cota Lambda
- Importar dados do Goldfish ou Melee

## Decisões fechadas

| Tema | Decisão |
|---|---|
| Escopo | Site inteiro, por formato |
| Arquétipo | `deck.nomeConsolidado`; vazio/nulo → `deck.nome` (não agrupa em Outros) |
| Janela | Query `dias` ∈ {7, 14, 30, 90, 365}, padrão **30** |
| Eventos | Só `status === "finalizado"` |
| Tamanho do evento | Qualquer |
| Torneio secreto | **Excluído** da agregação pública |
| Cálculo | On-the-fly no GET, sem coleção nova |
| Acesso | Público (sem JWT) |
| Bye | Não entra em winrate nem matchup (`jogador2Id == null`) |

## Regras de negócio

### Universo

1. Normalizar `formato` com `normalizarFormatoDeck`.
2. Incluir torneio se: `status === "finalizado"`, `secreto !== true`, formato normalizado igual, e `horario` ≥ (agora − `dias`) no fuso já usado pelo restante da API (Brasília para “hoje”, comparação em Date UTC do campo `horario`).
3. Cópia de arquétipo = inscrição com `deckId` cujo deck existe. Inscrição sem deck não conta.
4. Jogador dropado **conta** (jogou com aquele deck).

### Meta % e winrate (lista)

- `copias` = número de inscrições (com deck) daquele arquétipo no universo.
- `totalDecks` = soma das cópias de todos os arquétipos (inclui Outros).
- `metaPct` = `copias / totalDecks * 100`, uma casa decimal (ex.: 10.6). Se `totalDecks === 0`, lista vazia, não dividir.
- Partida válida para winrate: `status === "finalizada"`, dois jogadores, ambos com arquétipo resolvido (deck da partida ou fallback `inscricao.deckId` do jogador, igual `rankingLiga`).
- Vitória: mais game wins. Empate: game wins iguais.
- `winrate` = vitórias / (vitórias + derrotas + empates) * 100, uma casa decimal. Bye não entra.

### Carta representativa

- Commander / Commander 500: carta de `commander` mais frequente nas cópias; empate → ordem alfabética.
- Demais formatos: carta do **maindeck** com maior soma de cópias, excluindo terrenos básicos (lista fixa abaixo). Empate → alfabética.
- Básicos excluídos: Plains, Island, Swamp, Mountain, Forest, Wastes, Snow-Covered Plains/Island/Swamp/Mountain/Forest, e os mesmos nomes em minúsculas (os decks já normalizam nome em lowercase).

### Slug

- `slug` = `nomeConsolidado` em kebab-case ASCII: minúsculas, espaços → `-`, remover acentos, só `[a-z0-9-]`.
- **Outros** → slug `outros`.
- Colisão de dois nomes distintos no mesmo slug: sufixo `-2`, `-3` estável ordenando os nomes originais.

### Página de arquétipo

- Mesma janela `dias` e mesmo formato.
- **Lista típica:** carta entra no main se presente em ≥ 50% das listas do arquétipo; quantidade = mediana das quantidades **entre as listas que a têm**, arredondada ao inteiro mais próximo (mínimo 1). Sideboard igual, limiar 50%. Commander: moda das cartas de commander.
- **Outras listas:** cada deck distinto usado no período (id, jogador, nome original, main/side, link para `/editar-deck/:id`).
- **Matchup:** para cada outro arquétipo com ≥ 1 partida válida contra este: V–D–E e winrate. Ordenar por número de partidas desc.
- **Torneios:** uma linha por cópia: `torneioId`, nome do evento, `horario`, jogador (público), colocação no standing daquele torneio, recorde V–D–E nas partidas válidas daquele evento, `deckId`. Ordenar por `horario` desc.

### Erros

- `formato` ou `dias` inválidos → 400 (`ErroPersonalizado`).
- Slug sem arquétipo na janela → 404.
- Universo vazio → 200 com `arquetipos: []` e `totalDecks: 0`.

## API

```
GET /metagame?formato=&dias=30
GET /metagame/:formato/:slug?dias=30
```

Campos JSON em português. Sem auth.

### `GET /metagame`

Query: `formato` (obrigatório), `dias` (opcional, default 30).

```json
{
  "formato": "pauper",
  "dias": 30,
  "totalDecks": 187,
  "totalTorneios": 12,
  "arquetipos": [
    {
      "nome": "Blue Terror",
      "slug": "blue-terror",
      "copias": 20,
      "metaPct": 10.7,
      "vitorias": 40,
      "derrotas": 28,
      "empates": 2,
      "winrate": 57.1,
      "cartaRepresentativa": "tolarian terror"
    }
  ]
}
```

`arquetipos` ordenados por `copias` desc, empate por `winrate` desc, depois nome.

### `GET /metagame/:formato/:slug`

```json
{
  "formato": "pauper",
  "dias": 30,
  "nome": "Blue Terror",
  "slug": "blue-terror",
  "copias": 20,
  "metaPct": 10.7,
  "winrate": 57.1,
  "vitorias": 40,
  "derrotas": 28,
  "empates": 2,
  "cartaRepresentativa": "tolarian terror",
  "listaTipica": {
    "maindeck": [{ "nome": "brainstorm", "quantidade": 4 }],
    "sideboard": [{ "nome": "hydroblast", "quantidade": 3 }],
    "commander": []
  },
  "listas": [
    {
      "deckId": "uuid",
      "nome": "nome original do jogador",
      "usuario": { "id": "uuid", "nome": "FelA" },
      "torneioId": "uuid",
      "torneioNome": "Central Liga Gaúcha — Etapa 6",
      "maindeck": [],
      "sideboard": []
    }
  ],
  "matchups": [
    {
      "nome": "Affinity",
      "slug": "affinity",
      "vitorias": 8,
      "derrotas": 5,
      "empates": 0,
      "winrate": 61.5,
      "partidas": 13
    }
  ],
  "resultados": [
    {
      "torneioId": "uuid",
      "torneioNome": "…",
      "horario": "2026-07-26T15:00:00.000Z",
      "usuario": { "id": "uuid", "nome": "FelA" },
      "colocacao": 4,
      "vitorias": 4,
      "derrotas": 3,
      "empates": 0,
      "deckId": "uuid"
    }
  ]
}
```

## Front

- Rotas públicas lazy: `/metagame`, `/metagame/:formato/:slug`.
- Lista sempre com query na URL: `/metagame?formato=pauper&dias=30`. Default de UI: `formato=pauper`, `dias=30`. Seletor de formato = a mesma lista do cadastro de torneio/deck.
- Query `dias` e `formato` compartilháveis.
- Nav: item **Metagame** (público), ao lado de Decks/Torneios/Ligas.
- Lista: carta (arte Scryfall pela `cartaRepresentativa`), nome, meta %, winrate, barra de meta.
- Detalhe: lista típica (visual de deck existente), outras listas, tabela de matchup, tabela de resultados com link para `/torneios/:id` e `/editar-deck/:id`.
- `backendApi.js`: `buscarMetagame`, `buscarArquetipoMetagame`.
- `UuidParamGuard` **não** se aplica ao slug (não é UUID).

Default de formato no front: o primeiro formato do seletor do `TournamentCreate` / constantes de formato já usadas no cadastro. Se não houver constante central, reutilizar a lista do formulário de torneio.

## Infra

- `serverless.yaml`: eventos HTTP `path: /metagame` e `/metagame/{proxy+}` (mesmo CORS das outras).
- Camadas API: `casosDeUso/metagame/listarMetagame.ts`, `buscarArquetipoMetagame.ts` (ou um caso que atende os dois se a agregação for compartilhada num helper puro), gateways já existentes (`torneio`, `inscricao`, `partida`, `deck`, `usuario`). Preferir **helper puro** `agregarMetagame(...)` testável sem HTTP, usado pelos dois casos.
- Zod em `schemas.ts`.
- Documentar em `docs/metagame.md`.
- Testes Jest do helper (bye, janela, Outros, matchup, slug, secreto, universo vazio) + rota 400/404.

## UI (referência Goldfish, tema do app)

- Fundo dark roxo/violeta existente, não clonar CSS do Goldfish.
- Hierarquia: título “Metagame {Formato}”, filtros formato + dias, grid/lista de arquétipos, clique → detalhe.
- Estados: loading (Spinner), vazio (“Nenhum torneio finalizado neste período”), erro de API.

## Testes de aceitação

1. Finalizar um torneio Pauper com 2 arquétipos conhecidos → `/metagame?formato=pauper&dias=30` mostra meta % e winrate coerentes.
2. Bye não altera winrate.
3. Torneio secreto não aparece.
4. Trocar `dias` muda o conjunto.
5. Abrir arquétipo mostra lista típica, matchup e linha de resultado com colocação.
6. Deck sem `nomeConsolidado` aparece pelo `nome` do deck, não num grupo Outros.
7. Página pública sem login.
