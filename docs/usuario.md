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
| bloqueadoTorneios | boolean | Não | Se `true`, bloqueia novas inscrições/ingresso |
| excluido | boolean | Não | Soft-delete: conta anonimizada; login/refresh rejeitados |
| excluidoEm | Date | Não | Momento da exclusão da conta |
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

---

### GET /usuario/listar

**(Somente admin)** Lista usuários cadastrados com busca opcional por nome e paginação.

**Query params:**

| Param  | Tipo   | Descrição                          |
| ------ | ------ | ---------------------------------- |
| `nome` | string | Filtro parcial por nome/e-mail (opcional) |
| `bloqueadoTorneios` | `"true"` \| `"false"` | Filtra por bloqueio de torneios |
| `limite` | number | 1–100, padrão 20                 |
| `offset` | number | Deslocamento (padrão 0)            |

**Response (200):**

```json
{
  "usuarios": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nome": "João Silva",
      "email": "joao.silva@email.com",
      "nickMTGO": "joaosilva",
      "nickArena": "joaosilva#12345",
      "bloqueadoTorneios": false
    }
  ],
  "total": 42,
  "limite": 20,
  "offset": 0
}
```

**Erros:**

- `401` — Token inválido ou ausente
- `403` — Usuário não é admin
- `400` — Query params inválidos (validação Zod)

---

### POST /usuario/reset-senha/solicitar

Solicita o envio de um e-mail com link para redefinição de senha.

> **Segurança:** A resposta é sempre genérica, independente de o e-mail estar cadastrado ou não, para evitar enumeração de usuários.

**Request Body:**

```json
{
  "email": "joao.silva@email.com"
}
```

**Response (200 OK):**

```json
{
  "mensagem": "Se o e-mail estiver cadastrado, você receberá as instruções em breve."
}
```

**Notas:**
- O link enviado por e-mail expira em **1 hora**
- Ao solicitar novamente, o token anterior é invalidado
- Rota protegida por rate limiter

**Erros Possíveis:**

- `500 Internal Server Error` - Erro no servidor

---

### POST /usuario/reset-senha/confirmar

Confirma a redefinição de senha usando o token recebido por e-mail.

**Request Body:**

```json
{
  "token": "a3f9c2b1d4e5...",
  "novaSenha": "minhaNovaSenha123"
}
```

**Response (200 OK):**

```json
{
  "mensagem": "Senha redefinida com sucesso."
}
```

**Erros Possíveis:**

- `400 Bad Request` - Token inválido, expirado ou senha com menos de 8 caracteres
- `404 Not Found` - Usuário não encontrado
- `500 Internal Server Error` - Erro no servidor

### DELETE /usuario/conta

Exclusão de conta (soft-delete / anonimização LGPD). Requer autenticação.

**Não** remove decks, inscrições nem partidas. O perfil passa a aparecer como `"Usuário excluído"` com flag `excluido: true` nos payloads públicos.

**Request Body:**

```json
{
  "confirmacao": "Nome Exato Do Perfil"
}
```

**Response (200):**

```json
{
  "mensagem": "Conta excluída com sucesso."
}
```

**Erros:**

- `400` — Confirmação diferente do nome atual
- `403` — Admin, dono de torneio ou dono de time não pode excluir a conta
- `401` — Não autenticado

### PUT /usuario/:usuarioId/bloqueio-torneios

Admin bloqueia ou desbloqueia o usuário para novas participações em torneios (`bloqueadoTorneios`). Ao bloquear, remove inscrições apenas de torneios em `inscricoes_abertas`.

## Regras de Negócio

1. **Email único**: Cada email só pode ser cadastrado uma vez no sistema
2. **Senha**: Deve ser criptografada usando bcrypt antes de ser armazenada
3. **Token JWT**: Gerado no login e deve ser incluído no header de requisições autenticadas
4. **Email de boas-vindas**: Enviado automaticamente após o cadastro bem-sucedido
5. **Reset de senha**: Token de 32 bytes gerado com `crypto.randomBytes`, expira em 1 hora, uso único
6. **Segurança no reset**: A resposta de `/reset-senha/solicitar` é sempre genérica para não revelar se o e-mail está cadastrado
7. **Exclusão de conta (soft-delete)**: anonimiza PII; preserva decks e histórico de torneios; login/refresh rejeitam `excluido`
8. **Bloqueio de torneios**: independente do soft-delete; controlado por admin via `bloqueadoTorneios`
9. **Validações**:
   - Nome: obrigatório, mínimo 3 caracteres
   - Email: obrigatório, formato válido
   - Senha: obrigatório, mínimo 6 caracteres no cadastro; mínimo 8 caracteres na redefinição

## Casos de Uso

- [CadastrarUsuario](../src/casosDeUso/usuario/cadastrarUsuario.ts) - Registra novo usuário e envia e-mail de boas-vindas
- [LoginUsuario](../src/casosDeUso/usuario/loginUsuario.ts) - Autentica e gera token
- [AtualizarUsuario](../src/casosDeUso/usuario/atualizarUsuario.ts) - Atualiza dados do usuário
- [ExcluirConta](../src/casosDeUso/usuario/excluirConta.ts) - Soft-delete / anonimização
- [AlterarBloqueioTorneios](../src/casosDeUso/usuario/alterarBloqueioTorneios.ts) - Bloqueio admin
- [SolicitarResetSenha](../src/casosDeUso/usuario/solicitarResetSenha.ts) - Gera token e envia e-mail de redefinição
- [ConfirmarResetSenha](../src/casosDeUso/usuario/confirmarResetSenha.ts) - Valida token e redefine a senha

## Gateway

Interface de comunicação com o repositório:

- [UsuarioGateway](../src/dominio/gateway/usuarioGateway.ts)

## Repositório

Implementação DynamoDB:

- [UsuarioDynamoRepositorio](../src/infra/dynamodb/repositorios/usuarioDynamoRepositorio.ts)
