# Documentação - Times

## Visão Geral

O módulo de Times permite que usuários criem e gerenciem equipes dentro da plataforma. Times podem ser associados a Ligas do tipo `times`, agregando resultados coletivos nos rankings.

## Entidade Time

```typescript
{
  id: string;           // UUID gerado automaticamente
  nome: string;
  descricao?: string;
  imagemUrl?: string;
  donoId: string;       // ID do criador (automaticamente membro)
  membroIds: string[];  // Inclui o dono
  solicitacoesPendentes: string[]; // IDs de usuários aguardando aprovação
  conviteToken?: string;           // Token UUID para ingresso via link
  criadoEm: Date;
}
```

### Regras de negócio

- O dono do time é adicionado automaticamente como membro ao criar.
- Um usuário só pode pertencer a **um time** por vez.
- Somente o dono pode alterar, excluir, gerar convites, aprovar ou rejeitar solicitações.
- Qualquer membro pode sair do time, exceto o dono.
- O token de convite é regenerado a cada chamada de `POST /time/:id/gerar-convite`.

---

## Endpoints

Todos os endpoints requerem **🔒 JWT** no header `Authorization: Bearer {token}`.

### `POST /time/criar`

Cria um novo time. O usuário autenticado torna-se o dono.

**Body:**

```json
{
  "nome": "Team Alpha",
  "descricao": "Nosso time competitivo",
  "imagemUrl": "https://..."
}
```

| Campo | Tipo | Obrigatório |
|---|---|---|
| `nome` | string | Sim |
| `descricao` | string | Não |
| `imagemUrl` | string (URL) | Não |

**Resposta `201`:**

```json
{
  "id": "uuid",
  "nome": "Team Alpha",
  "descricao": "Nosso time competitivo",
  "imagemUrl": "https://...",
  "donoId": "uuid-dono",
  "membroIds": ["uuid-dono"],
  "criadoEm": "2025-01-01T00:00:00.000Z"
}
```

---

### `GET /time/listar`

Lista todos os times cadastrados.

**Resposta `200`:**

```json
[
  {
    "id": "uuid",
    "nome": "Team Alpha",
    "donoId": "uuid-dono",
    "membroIds": ["uuid-dono", "uuid-membro"],
    "criadoEm": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### `GET /time/:id`

Busca um time pelo ID.

**Resposta `200`:**

```json
{
  "id": "uuid",
  "nome": "Team Alpha",
  "descricao": "Nosso time competitivo",
  "imagemUrl": "https://...",
  "donoId": "uuid-dono",
  "membroIds": ["uuid-dono", "uuid-membro"],
  "solicitacoesPendentes": [],
  "criadoEm": "2025-01-01T00:00:00.000Z"
}
```

---

### `PUT /time/:id`

Atualiza nome, descrição ou imagem do time. Apenas o dono pode alterar.

**Body:**

```json
{
  "nome": "Team Alpha v2",
  "descricao": "Nova descrição",
  "imagemUrl": "https://..."
}
```

**Resposta `200`:** objeto Time atualizado.

---

### `DELETE /time/:id`

Exclui o time. Apenas o dono pode excluir.

**Resposta `200`:**

```json
{ "mensagem": "Time excluído com sucesso." }
```

---

### `POST /time/:id/entrar`

O usuário autenticado entra diretamente no time (sem necessidade de aprovação).

> Retorna erro `400` se o usuário já for membro de outro time.

**Resposta `200`:**

```json
{
  "timeId": "uuid",
  "membroIds": ["uuid-dono", "uuid-novo-membro"]
}
```

---

### `POST /time/:id/sair`

O usuário autenticado sai do time.

> O dono não pode sair do próprio time.

**Resposta `200`:**

```json
{
  "timeId": "uuid",
  "membroIds": ["uuid-dono"]
}
```

---

### `POST /time/:id/gerar-convite`

_(Apenas o dono)_ Gera um novo token de convite, substituindo o anterior.

**Resposta `200`:**

```json
{ "conviteToken": "uuid-token" }
```

---

### `POST /time/:id/entrar-por-convite`

Entra no time usando um token de convite.

**Body:**

```json
{ "conviteToken": "uuid-token" }
```

> Retorna erro `400` se o token for inválido ou o usuário já pertencer a outro time.

**Resposta `200`:**

```json
{
  "timeId": "uuid",
  "membroIds": ["uuid-dono", "uuid-novo-membro"]
}
```

---

### `POST /time/:id/solicitar`

Envia uma solicitação de entrada no time. Fica pendente até aprovação do dono.

**Resposta `200`:**

```json
{
  "timeId": "uuid",
  "solicitacoesPendentes": ["uuid-solicitante"]
}
```

---

### `POST /time/:id/aprovar`

_(Apenas o dono)_ Aprova a solicitação de um usuário.

**Body:**

```json
{ "usuarioId": "uuid-solicitante" }
```

> Retorna erro `400` se o solicitante já pertencer a outro time.

**Resposta `200`:**

```json
{
  "timeId": "uuid",
  "usuario": { "id": "uuid", "nome": "Nome do Usuário" },
  "membroIds": ["uuid-dono", "uuid-aprovado"]
}
```

---

### `POST /time/:id/rejeitar`

_(Apenas o dono)_ Rejeita a solicitação de um usuário.

**Body:**

```json
{ "usuarioId": "uuid-solicitante" }
```

**Resposta `200`:**

```json
{
  "timeId": "uuid",
  "solicitacoesPendentes": []
}
```

---

## Erros Comuns

| Status | Situação |
|---|---|
| `401` | Token JWT ausente ou inválido |
| `403` | Ação restrita ao dono do time |
| `404` | Time não encontrado |
| `400` | Usuário já é membro de outro time |
| `400` | Token de convite inválido |
| `400` | Solicitação não encontrada |

---

## Casos de Uso

| Caso de Uso | Arquivo |
|---|---|
| Criar time | `src/casosDeUso/time/criarTime.ts` |
| Listar times | `src/casosDeUso/time/listarTimes.ts` |
| Buscar time | `src/casosDeUso/time/buscarTime.ts` |
| Alterar time | `src/casosDeUso/time/alterarTime.ts` |
| Excluir time | `src/casosDeUso/time/excluirTime.ts` |
| Entrar no time | `src/casosDeUso/time/entrarTime.ts` |
| Sair do time | `src/casosDeUso/time/sairTime.ts` |
| Gerar convite | `src/casosDeUso/time/gerarConviteTime.ts` |
| Entrar por convite | `src/casosDeUso/time/entrarPorConviteTime.ts` |
| Solicitar entrada | `src/casosDeUso/time/solicitarEntradaTime.ts` |
| Aprovar solicitação | `src/casosDeUso/time/aprovarSolicitacaoTime.ts` |
| Rejeitar solicitação | `src/casosDeUso/time/rejeitarSolicitacaoTime.ts` |
