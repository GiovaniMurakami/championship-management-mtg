# Entidade: Usuário

## Descrição

Representa um usuário do sistema de gerenciamento de campeonatos de Magic: The Gathering.

## Estrutura da Entidade

```typescript
interface UsuarioProps {
  id: string;
  nome: string;
  email: string;
  senha: string;
  role?: "user" | "admin";
  telefone?: string;
  nickMTGO?: string;
  nickArena?: string;
  criadoEm?: Date;
}
```

### Propriedades

| Campo     | Tipo   | Obrigatório | Descrição                                                              |
| --------- | ------ | ----------- | ---------------------------------------------------------------------- |
| id        | string | Sim         | Identificador único UUID do usuário                                    |
| nome      | string | Sim         | Nome completo do usuário                                               |
| email     | string | Sim         | Email único do usuário (usado para login)                              |
| senha     | string | Sim         | Senha criptografada com bcrypt                                         |
| role      | string | Não         | Papel do usuário: `"user"` (padrão) ou `"admin"`. Definido no banco.   |
| telefone  | string | Não         | Telefone de contato do usuário                                         |
| nickMTGO  | string | Não         | Username do Magic: The Gathering Online                                |
| nickArena | string | Não         | Username do Magic: The Gathering Arena                                 |
| criadoEm  | Date   | Não         | Data de criação do registro (gerada automaticamente)                   |

## Endpoints

### POST /usuario/cadastrar

Cadastra um novo usuário no sistema.

**Request Body:**

```json
{
  "nome": "João Silva",
  "email": "joao.silva@email.com",
  "senha": "senha123"
}
```

**Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nome": "João Silva",
  "email": "joao.silva@email.com",
  "criadoEm": "2026-03-09T22:00:00.000Z"
}
```

**Erros Possíveis:**

- `400 Bad Request` - Dados inválidos ou email já cadastrado
- `500 Internal Server Error` - Erro no servidor

---

### POST /usuario/login

Realiza autenticação do usuário e retorna token JWT.

**Request Body:**

```json
{
  "email": "joao.silva@email.com",
  "senha": "senha123"
}
```

**Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nome": "João Silva",
    "email": "joao.silva@email.com",
    "role": "user",
    "telefone": "+55 11 98765-4321",
    "nickMTGO": "joaomagic",
    "nickArena": "JoaoMTG#12345"
  }
}
```

> **Nota:** Os campos `telefone`, `nickMTGO` e `nickArena` só aparecem se foram previamente cadastrados. O campo `role` sempre estará presente (`"user"` ou `"admin"`).

**Erros Possíveis:**

- `401 Unauthorized` - Email ou senha incorretos
- `400 Bad Request` - Dados inválidos
- `500 Internal Server Error` - Erro no servidor

---

---

### POST /usuario/refresh-token

Gera um novo token JWT com expiração renovada para o usuário autenticado.

**Autenticação:** Requer token válido no header `Authorization`.

**Request:**

```bash
POST /usuario/refresh-token
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Erros Possíveis:**

- `401 Unauthorized` - Token ausente, inválido ou expirado
- `500 Internal Server Error` - Erro no servidor

---

### PUT /usuario/atualizar

Atualiza informações do usuário autenticado.
Campos opcionais**: telefone, nickMTGO e nickArena podem ser adicionados/atualizados posteriormente 5. **Validações\*\*:

- Nome: obrigatório no cadastro, mínimo 3 caracteres
- Email: obrigatório, formato válido, único no sistema
- Senha: obrigatório no cadastro, mínimo 6 caracteres
- Telefone: opcional, pode ser removido enviando string vazia
- Nicks (MTGO/Arena): opcionais, podem ser removidos enviando string vazia

## Casos de Uso

- [CadastrarUsuario](../src/casosDeUso/usuario/cadastrarUsuario.ts) - Registra novo usuário
- [LoginUsuario](../src/casosDeUso/usuario/loginUsuario.ts) - Autentica e gera token
- [AtualizarUsuario](../src/casosDeUso/usuario/atualizarUsuario.ts) - Atualiza dados do usuário
  **Request Body:**

```json
{
  "nome": "João Silva Santos",
  "telefone": "+55 11 98765-4321",
  "nickMTGO": "joaomagic",
  "nickArena": "JoaoMTG#12345"
}
```

> **Nota:** Todos os campos são opcionais. Envie apenas os campos que deseja atualizar.

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nome": "João Silva Santos",
  "email": "joao.silva@email.com",
  "telefone": "+55 11 98765-4321",
  "nickMTGO": "joaomagic",
  "nickArena": "JoaoMTG#12345",
  "criadoEm": "2026-03-09T22:00:00.000Z"
}
```

**Exemplos de Requisição:**

Atualizar apenas o telefone:

```json
{
  "telefone": "+55 11 98765-4321"
}
```

Atualizar apenas nicks:

```json
{
  "nickMTGO": "joaomagic",
  "nickArena": "JoaoMTG#12345"
}
```

Remover um campo (enviar string vazia):

```json
{
  "telefone": ""
}
```

**Erros Possíveis:**

- `401 Unauthorized` - Token inválido ou ausente
- `404 Not Found` - Usuário não encontrado
- `400 Bad Request` - Dados inválidos (ex: nome com menos de 3 caracteres)
- `500 Internal Server Error` - Erro no servidor

## Regras de Negócio

1. **Email único**: Cada email só pode ser cadastrado uma vez no sistema
2. **Senha**: Deve ser criptografada usando bcrypt antes de ser armazenada
3. **Token JWT**: Gerado no login e deve ser incluído no header de requisições autenticadas
4. **Validações**:
   - Nome: obrigatório, mínimo 3 caracteres
   - Email: obrigatório, formato válido
   - Senha: obrigatório, mínimo 6 caracteres

## Casos de Uso

- [CadastrarUsuario](../src/casosDeUso/usuario/cadastrarUsuario.ts) - Registra novo usuário
- [LoginUsuario](../src/casosDeUso/usuario/loginUsuario.ts) - Autentica e gera token

## Gateway

Interface de comunicação com o repositório:

- [UsuarioGateway](../src/dominio/gateway/usuarioGateway.ts)

## Repositório

Implementação MongoDB:

- [UsuarioRepositorio](../src/infra/mongodb/repositorios/usuarioRepositorio.ts)
