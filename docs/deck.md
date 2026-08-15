# Entidade: Deck

## Descrição

Representa um deck de Magic: The Gathering associado a um usuário.

## Estrutura da Entidade

```typescript
interface Carta {
  nome: string;
  quantidade: number;
}

interface DeckProps {
  id: string;
  nome: string;
  formato: string;
  maindeck: Carta[];
  sideboard: Carta[];
  usuarioId: string;
  nomeConsolidado?: string | null;
  cartaRepresentativa?: string | null;
  criadoEm?: Date;
}
```

### Propriedades

| Campo           | Tipo           | Obrigatório | Descrição                                                                                       |
| --------------- | -------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| id              | string         | Sim         | Identificador único UUID do deck                                                                |
| nome            | string         | Sim         | Nome do deck                                                                                    |
| formato         | string         | Sim         | Formato do deck (Commander, Standard, Modern, etc.)                                             |
| maindeck        | Carta[]        | Sim         | Array de cartas do deck principal                                                               |
| sideboard       | Carta[]        | Sim         | Array de cartas do sideboard/banco de reservas                                                  |
| usuarioId       | string         | Sim         | ID do usuário proprietário do deck                                                              |
| nomeConsolidado | string \| null | Não         | Nome do arquétipo: começa igual ao `nome` do deck; admin pode alterar. `null` se limpo. |
| cartaRepresentativa | string \| null | Não     | Carta cuja arte representa o arquétipo no metagame. Admin define; `null` volta à mais jogada. |
| criadoEm        | Date           | Não         | Data de criação do registro (gerada automaticamente)                                            |

### Tipo Carta

| Campo      | Tipo   | Descrição                     |
| ---------- | ------ | ----------------------------- |
| nome       | string | Nome da carta                 |
| quantidade | number | Quantidade de cópias da carta |

## Endpoints

> **⚠️ Atenção:** Todos os endpoints de deck requerem autenticação via token JWT no header.
>
> Em `GET /deck/listar` e `GET /deck/:id`, `usuario.nome` é o **nick MOL** (`nickMTGO`), com fallback para o nome cadastrado.

### POST /deck/cadastrar

Cadastra um novo deck.

**Headers:**

```
Authorization: Bearer {token}
```

**Request Body:**

```json
{
  "nome": "Atraxa Superfriends",
  "formato": "Commander",
  "maindeck": [
    {
      "nome": "Atraxa, Praetors' Voice",
      "quantidade": 1
    },
    {
      "nome": "Sol Ring",
      "quantidade": 1
    },
    {
      "nome": "Command Tower",
      "quantidade": 1
    }
  ],
  "sideboard": []
}
```

**Response (201 Created):**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "nome": "Atraxa Superfriends",
  "formato": "Commander",
  "maindeck": [...],
  "sideboard": [],
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nome": "João Silva"
  },
  "nomeConsolidado": "Atraxa Superfriends",
  "criadoEm": "2026-03-09T22:00:00.000Z"
}
```

**Erros Possíveis:**

- `401 Unauthorized` - Token inválido ou ausente
- `400 Bad Request` - Dados inválidos
- `500 Internal Server Error` - Erro no servidor

---

### PUT /deck/atualizar/:id

Atualiza um deck existente.

**Headers:**

```
Authorization: Bearer {token}
```

**Parâmetros de URL:**

- `id` - ID do deck a ser atualizado

**Request Body:**

```json
{
  "nome": "Atraxa Superfriends v2",
  "formato": "Commander",
  "maindeck": [
    {
      "nome": "Atraxa, Praetors' Voice",
      "quantidade": 1
    },
    {
      "nome": "Doubling Season",
      "quantidade": 1
    }
  ],
  "sideboard": []
}
```

**Response (200 OK):**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "nome": "Atraxa Superfriends v2",
  "formato": "Commander",
  "maindeck": [...],
  "sideboard": [],
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nome": "João Silva"
  },
  "nomeConsolidado": "Atraxa Superfriends",
  "criadoEm": "2026-03-09T22:00:00.000Z"
}
```

**Erros Possíveis:**

- `401 Unauthorized` - Token inválido ou ausente
- `403 Forbidden` - Usuário não é proprietário do deck
- `404 Not Found` - Deck não encontrado
- `400 Bad Request` - Dados inválidos
- `500 Internal Server Error` - Erro no servidor

---

### DELETE /deck/excluir/:id

Exclui um deck.

**Headers:**

```
Authorization: Bearer {token}
```

**Parâmetros de URL:**

- `id` - ID do deck a ser excluído

**Response (204 No Content)**

**Erros Possíveis:**

- `401 Unauthorized` - Token inválido ou ausente
- `403 Forbidden` - Usuário não é proprietário do deck
- `404 Not Found` - Deck não encontrado
- `500 Internal Server Error` - Erro no servidor

---

### GET /deck/:id

Busca um deck pelo seu ID.

**Headers:**

```
Authorization: Bearer {token}
```

**Parâmetros de URL:**

- `id` - ID do deck

**Response (200 OK):**

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "nome": "Atraxa Superfriends",
  "formato": "Commander",
  "maindeck": [
    {
      "nome": "Atraxa, Praetors' Voice",
      "quantidade": 1
    }
  ],
  "sideboard": [],
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nome": "fel_mtgo"
  },
  "criadoEm": "2026-03-09T22:00:00.000Z"
}
```

**Erros Possíveis:**

- `401 Unauthorized` - Token inválido ou ausente
- `404 Not Found` - Deck não encontrado
- `500 Internal Server Error` - Erro no servidor

---

### GET /deck/listar

Lista todos os decks do usuário autenticado.

**Headers:**

```
Authorization: Bearer {token}
```

**Response (200 OK):**

Array de decks do usuário:

```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "nome": "Atraxa Superfriends",
    "formato": "Commander",
    "maindeck": [
      {
        "nome": "Atraxa, Praetors' Voice",
        "quantidade": 1
      },
      {
        "nome": "Sol Ring",
        "quantidade": 1
      }
    ],
    "sideboard": [],
    "usuario": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nome": "fel_mtgo"
    },
    "nomeConsolidado": "Atraxa Superfriends",
    "criadoEm": "2026-03-09T22:00:00.000Z"
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "nome": "Meu Deck Favorito",
    "formato": "Modern",
    "maindeck": [...],
    "sideboard": [],
    "usuario": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nome": "fel_mtgo"
    },
    "nomeConsolidado": "Burn",
    "criadoEm": "2026-03-08T10:30:00.000Z"
  }
]
```

> Retorna um array vazio `[]` se o usuário não tiver decks cadastrados.

**Erros Possíveis:**

- `401 Unauthorized` - Token inválido ou ausente
- `500 Internal Server Error` - Erro no servidor

## Regras de Negócio

1. **Propriedade**: Usuário só pode manipular (atualizar/excluir) seus próprios decks
2. **Formatos**: Validar formatos permitidos (Commander, Standard, Modern, Legacy, Vintage, Pauper, etc.)
3. **Cartas**:
   - Cada carta deve ter nome e quantidade
   - Quantidade deve ser maior que 0
4. **Autenticação**: Todos os endpoints exigem token JWT válido
5. **Validações**:
   - Nome: obrigatório, mínimo 3 caracteres
   - Formato: obrigatório
   - Maindeck: obrigatório, deve conter pelo menos 1 carta
6. **Nome Consolidado**: Ao cadastrar um deck, `nomeConsolidado` recebe o mesmo valor de `nome`. Admin pode alterar depois (ex.: na página de metagame). Enviar `null` limpa o campo.
7. **Carta representativa**: Admin pode definir `cartaRepresentativa` (também em deck travado de torneio). Enviar `null` remove o override e o metagame volta à carta mais jogada.

## Casos de Uso

- [CadastrarDeck](../src/casosDeUso/deck/cadastrarDeck.ts) - Registra novo deck
- [AtualizarDeck](../src/casosDeUso/deck/atualizarDeck.ts) - Atualiza deck existente
- [ExcluirDeck](../src/casosDeUso/deck/excluirDeck.ts) - Remove deck
- [BuscarDeck](../src/casosDeUso/deck/buscarDeck.ts) - Busca deck por ID
- [ListarDecks](../src/casosDeUso/deck/listarDecks.ts) - Lista decks do usuário

## Gateway

Interface de comunicação com o repositório:

- [DeckGateway](../src/dominio/gateway/deckGateway.ts)

## Repositório

Implementação MongoDB:

- [DeckRepositorio](../src/infra/mongodb/repositorios/deckRepositorio.ts)

## Middleware de Autenticação

- [autenticarJwt](../src/middlewares/express/autenticarJwt.ts) - Valida token e injeta dados do usuário na requisição
