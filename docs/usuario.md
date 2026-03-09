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
  criadoEm?: Date;
}
```

### Propriedades

| Campo    | Tipo   | Obrigatório | Descrição                                            |
| -------- | ------ | ----------- | ---------------------------------------------------- |
| id       | string | Sim         | Identificador único UUID do usuário                  |
| nome     | string | Sim         | Nome completo do usuário                             |
| email    | string | Sim         | Email único do usuário (usado para login)            |
| senha    | string | Sim         | Senha criptografada com bcrypt                       |
| criadoEm | Date   | Não         | Data de criação do registro (gerada automaticamente) |

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
    "email": "joao.silva@email.com"
  }
}
```

**Erros Possíveis:**

- `401 Unauthorized` - Email ou senha incorretos
- `400 Bad Request` - Dados inválidos
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
