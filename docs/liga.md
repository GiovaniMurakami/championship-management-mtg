# Documentação - Ligas

## Visão Geral

Uma Liga agrupa torneios e gera rankings consolidados de jogadores, decks e cartas ao longo dos torneios associados. Ligas do tipo `times` também produzem ranking de equipes.

## Entidade Liga

```typescript
{
  id: string;           // UUID gerado automaticamente
  nome: string;
  descricao?: string;
  donoId: string;       // ID do admin criador
  torneioIds: string[]; // IDs dos torneios que compõem a liga
  tipo: "individual" | "times"; // default: "individual"
  criadoEm: Date;
}
```

### Regras de negócio

- Somente usuários com `role: "admin"` podem criar, alterar ou excluir ligas.
- Ao criar, todos os `torneioIds` informados são validados — retorna `404` se algum torneio não existir.
- O ranking é calculado em tempo real a partir das partidas **finalizadas** dos torneios da liga.
- Byes não contam como derrota do adversário.
- Pontuação: vitória = 3pts, empate = 1pt, derrota = 0pt.
- Rankings de decks agrupam por `nomeConsolidado` (quando disponível) ou `nome`.
- Rankings de times só aparecem em ligas do tipo `times` e são calculados diretamente por partida finalizada.

---

## Endpoints

### `POST /liga/criar` 🔒 Admin

Cria uma nova liga.

**Body:**

```json
{
  "nome": "Liga Temporada 2025",
  "descricao": "Torneios do primeiro semestre",
  "torneioIds": ["uuid-torneio-1", "uuid-torneio-2"],
  "tipo": "individual"
}
```

| Campo | Tipo | Obrigatório | Default |
|---|---|---|---|
| `nome` | string | Sim | — |
| `descricao` | string | Não | — |
| `torneioIds` | string[] | Não | `[]` |
| `tipo` | `"individual"` \| `"times"` | Não | `"individual"` |

**Resposta `201`:**

```json
{
  "id": "uuid",
  "nome": "Liga Temporada 2025",
  "descricao": "Torneios do primeiro semestre",
  "donoId": "uuid-admin",
  "torneioIds": ["uuid-torneio-1", "uuid-torneio-2"],
  "tipo": "individual",
  "criadoEm": "2025-01-01T00:00:00.000Z"
}
```

---

### `GET /liga/listar` 🔒

Lista todas as ligas.

**Resposta `200`:**

```json
[
  {
    "id": "uuid",
    "nome": "Liga Temporada 2025",
    "donoId": "uuid-admin",
    "torneioIds": ["uuid-torneio-1"],
    "tipo": "individual",
    "criadoEm": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### `GET /liga/:id` 🔒

Busca uma liga pelo ID.

**Resposta `200`:** objeto Liga completo.

---

### `PUT /liga/:id` 🔒 Admin

Atualiza dados de uma liga. Apenas admins podem alterar.

**Body** (todos os campos opcionais):

```json
{
  "nome": "Liga Novo Nome",
  "descricao": "Nova descrição",
  "torneioIds": ["uuid-torneio-1", "uuid-torneio-3"]
}
```

**Resposta `200`:** objeto Liga atualizado.

---

### `DELETE /liga/:id` 🔒 Admin

Exclui a liga. Apenas admins podem excluir.

**Resposta `200`:**

```json
{ "mensagem": "Liga excluída com sucesso." }
```

---

### `GET /liga/:id/ranking`

Retorna o ranking consolidado da liga. Leitura pública. Rate limit **40 req / 15 min** por IP (`heavy-read`). Suporta parâmetros de query para limitar resultados.

**Query params:**

| Parâmetro | Tipo | Default | Máximo |
|---|---|---|---|
| `limiteJogadores` | number | `10` | `200` |
| `limiteTimes` | number | `10` | `200` |
| `limiteDecks` | number | `10` | `200` |
| `limiteCartas` | number | `10` | `200` |

**Resposta `200` — Liga Individual:**

```json
{
  "ligaId": "uuid",
  "ligaNome": "Liga Temporada 2025",
  "tipo": "individual",
  "rankingJogadores": [
    {
      "posicao": 1,
      "jogador": { "id": "uuid", "nome": "fel_mtgo" },
      "vitorias": 10,
      "derrotas": 2,
      "empates": 1,
      "pontos": 31
    }
  ],
  "totalJogadores": 24,
  "rankingDecks": [
    {
      "posicao": 1,
      "nome": "Mono Red Aggro",
      "totalUsos": 15,
      "vitorias": 10,
      "derrotas": 4,
      "empates": 1,
      "winrate": 66.7,
      "loserate": 26.7
    }
  ],
  "totalDecks": 12,
  "rankingCartas": [
    {
      "posicao": 1,
      "nome": "Lightning Bolt",
      "totalCopias": 56,
      "totalDecks": 14
    }
  ],
  "totalCartas": 200
}
```

**Resposta `200` — Liga de Times** (inclui campos adicionais):

```json
{
  "ligaId": "uuid",
  "ligaNome": "Liga Times 2025",
  "tipo": "times",
  "rankingJogadores": [...],
  "totalJogadores": 24,
  "rankingDecks": [...],
  "totalDecks": 12,
  "rankingCartas": [...],
  "totalCartas": 200,
  "rankingTimes": [
    {
      "posicao": 1,
      "time": { "id": "uuid", "nome": "Team Alpha" },
      "vitorias": 25,
      "derrotas": 5,
      "empates": 2,
      "pontos": 77
    }
  ],
  "totalTimes": 6
}
```

#### Cálculo do ranking

- **Jogadores**: ordenados por pontos (desc), depois vitórias (desc). `jogador.nome` é o nick MOL (`nickMTGO`), com fallback para o nome cadastrado.
- **Decks**: agrupados por `nomeConsolidado` (ou `nome`), ordenados por `totalUsos` (desc), depois vitórias (desc). `winrate` e `loserate` em porcentagem com 1 casa decimal.
- **Cartas**: contagem de cópias no maindeck de todos os decks usados na liga, ordenadas por `totalCopias` (desc).
- **Times**: calculados diretamente por partida finalizada, usando o `timeId` da inscrição do jogador naquele torneio. Vitória soma 3 pontos, empate soma 1 e derrota soma 0. Partidas entre membros do mesmo time não alteram o ranking coletivo. Apenas para `tipo: "times"`.

---

## Erros Comuns

| Status | Situação |
|---|---|
| `401` | Token JWT ausente ou inválido |
| `403` | Usuário não é admin (para criar/alterar/excluir) |
| `404` | Liga não encontrada |
| `404` | Torneio informado em `torneioIds` não encontrado |

---

## Casos de Uso

| Caso de Uso | Arquivo |
|---|---|
| Criar liga | `src/casosDeUso/liga/criarLiga.ts` |
| Alterar liga | `src/casosDeUso/liga/alterarLiga.ts` |
| Excluir liga | `src/casosDeUso/liga/excluirLiga.ts` |
| Listar ligas | `src/casosDeUso/liga/listarLigas.ts` |
| Buscar liga | `src/casosDeUso/liga/buscarLiga.ts` |
| Ranking da liga | `src/casosDeUso/liga/rankingLiga.ts` |
