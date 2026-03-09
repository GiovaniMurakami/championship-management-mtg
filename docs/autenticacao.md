# Autenticação JWT

## Visão Geral

A API utiliza **JSON Web Tokens (JWT)** para autenticação e autorização de usuários. O token é gerado no login e deve ser incluído em todas as requisições que exigem autenticação.

## Fluxo de Autenticação

```
1. Usuário faz cadastro     → POST /usuario/cadastrar
2. Usuário faz login        → POST /usuario/login → Recebe token JWT
3. Cliente guarda o token   → localStorage/sessionStorage
4. Requisições autenticadas → Header: Authorization: Bearer {token}
5. API valida o token       → Middleware autenticarJwt
6. Endpoint processa        → Acesso aos dados do usuário via req.usuario
```

## Estrutura do Token JWT

### Payload

O token contém as seguintes informações do usuário:

```typescript
{
  id: string; // UUID do usuário
  email: string; // Email do usuário
  nome: string; // Nome do usuário
  iat: number; // Timestamp de emissão
  exp: number; // Timestamp de expiração (se configurado)
}
```

### Exemplo de Token

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoiam9hby5zaWx2YUBlbWFpbC5jb20iLCJub21lIjoiSm_Do28gU2lsdmEiLCJpYXQiOjE2NDAwMDAwMDB9.xXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx
```

## Como Obter o Token

### 1. Cadastrar Usuário (Opcional)

```bash
POST /usuario/cadastrar
Content-Type: application/json

{
  "nome": "João Silva",
  "email": "joao.silva@email.com",
  "senha": "senha123"
}
```

### 2. Fazer Login

```bash
POST /usuario/login
Content-Type: application/json

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

## Como Usar o Token

### Em Requisições HTTP

Inclua o token no header `Authorization` com o prefixo `Bearer`:

```bash
POST /deck/cadastrar
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "nome": "Meu Deck",
  "formato": "Commander",
  "maindeck": [...],
  "sideboard": []
}
```

### Exemplo JavaScript/Fetch

```javascript
const token = localStorage.getItem('token');

const response = await fetch('/deck/cadastrar', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    nome: 'Meu Deck',
    formato: 'Commander',
    maindeck: [...],
    sideboard: []
  })
});
```

### Exemplo Axios

```javascript
import axios from 'axios';

const token = localStorage.getItem('token');

axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

const response = await axios.post('/deck/cadastrar', {
  nome: 'Meu Deck',
  formato: 'Commander',
  maindeck: [...],
  sideboard: []
});
```

## Middleware de Autenticação

O middleware `autenticarJwt` é aplicado nas rotas que requerem autenticação:

```typescript
// Rota protegida
cadastrarDeckRoute.getMiddlewares = () => [autenticarJwt];
```

### Funcionamento do Middleware

1. **Extrai o token** do header `Authorization`
2. **Valida o token** usando o secret (`JWT_SECRET`)
3. **Decodifica o payload** e extrai informações do usuário
4. **Injeta os dados** em `req.usuario` para uso nos endpoints
5. **Rejeita** com erro 401 se o token for inválido

### Acessando Dados do Usuário Autenticado

Após a autenticação, os dados do usuário ficam disponíveis em `req.usuario`:

```typescript
// No handler da rota
async handler(req: Request, res: Response) {
  const usuarioId = req.usuario.id;      // ID do usuário autenticado
  const email = req.usuario.email;       // Email do usuário
  const nome = req.usuario.nome;         // Nome do usuário

  // Usar nos casos de uso
  await cadastrarDeck.execute({
    ...req.body,
    usuarioId
  });
}
```

## Erros de Autenticação

### Token Não Informado (401)

**Request:**

```bash
POST /deck/cadastrar
# Header Authorization ausente
```

**Response:**

```json
{
  "mensagem": "Token não informado."
}
```

### Token Inválido ou Expirado (401)

**Request:**

```bash
POST /deck/cadastrar
Authorization: Bearer token_invalido_ou_expirado
```

**Response:**

```json
{
  "mensagem": "Token inválido ou expirado."
}
```

### Sem Permissão (403)

Ocorre quando o token é válido, mas o usuário não tem permissão para a ação:

**Example:** Tentando excluir deck de outro usuário

**Response:**

```json
{
  "mensagem": "Você não tem permissão para excluir este deck",
  "erros": ["Apenas o proprietário pode excluir o deck"]
}
```

## Configuração

### Variável de Ambiente

O secret do JWT deve ser configurado no arquivo `.env`:

```env
JWT_SECRET=seu_secret_super_secreto_aqui
```

⚠️ **Importante:**

- Use um secret forte e aleatório
- Nunca commite o `.env` no repositório
- Em produção, use um secret diferente do desenvolvimento

### Gerando um Secret Forte

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# OpenSSL
openssl rand -hex 64
```

## Boas Práticas

1. **Armazene o token com segurança**
   - Use `httpOnly` cookies quando possível
   - Evite `localStorage` para dados muito sensíveis
   - Considere `sessionStorage` para sessões temporárias

2. **Implemente refresh tokens** (futuro)
   - Tokens de curta duração (15-30 min)
   - Refresh tokens para renovação

3. **Validação no cliente**
   - Verifique expiração antes de fazer requisições
   - Redirecione para login se token expirado

4. **Logout**
   - Remova o token do armazenamento
   - Considere blacklist de tokens (futuro)

5. **HTTPS obrigatório em produção**
   - Tokens devem ser transmitidos apenas via HTTPS

## Endpoints que Requerem Autenticação

| Endpoint              | Método | Autenticação |
| --------------------- | ------ | ------------ |
| `/usuario/cadastrar`  | POST   | ❌ Não       |
| `/usuario/login`      | POST   | ❌ Não       |
| `/deck/cadastrar`     | POST   | ✅ Sim       |
| `/deck/atualizar/:id` | PUT    | ✅ Sim       |
| `/deck/excluir/:id`   | DELETE | ✅ Sim       |

## Type Definitions

O TypeScript foi estendido para incluir a propriedade `usuario` no objeto `Request`:

```typescript
// src/types/express/index.d.ts
declare namespace Express {
  export interface Request {
    usuario?: {
      id: string;
      email: string;
      nome: string;
    };
  }
}
```

## Referências

- [Middleware autenticarJwt](../src/middlewares/express/autenticarJwt.ts)
- [Type Definitions](../src/types/express/index.d.ts)
- [LoginUsuario](../src/casosDeUso/usuario/loginUsuario.ts)
- [JWT.io](https://jwt.io/) - Decodificador de tokens JWT
