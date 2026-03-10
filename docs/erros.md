# Tratamento de Erros

## Visão Geral

O projeto utiliza uma classe personalizada `ErroPersonalizado` para padronizar o tratamento de erros em toda a aplicação.

## Estrutura do Erro

```typescript
class ErroPersonalizado extends Error {
  status: number; // Código HTTP do erro
  erros: string[]; // Lista de mensagens de erro
  extra: unknown | null; // Dados adicionais (opcional)
}
```

## Status de Erro

O sistema utiliza os seguintes códigos de status HTTP:

| Código | Enum                           | Descrição             | Quando Usar                                |
| ------ | ------------------------------ | --------------------- | ------------------------------------------ |
| 400    | `StatusErro.erroParametro`     | Bad Request           | Dados de entrada inválidos ou faltando     |
| 401    | `StatusErro.erroNaoAutorizado` | Unauthorized          | Token ausente ou inválido                  |
| 403    | `StatusErro.erroProibido`      | Forbidden             | Token válido mas sem permissão para a ação |
| 404    | `StatusErro.erroNaoEncontrado` | Not Found             | Recurso não encontrado                     |
| 500    | `StatusErro.erroServidor`      | Internal Server Error | Erro inesperado no servidor                |

## Como Criar Erros

### Erro Simples

```typescript
import { ErroPersonalizado } from "@/helpers/error/ErroPersonalizado";
import { StatusErro } from "@/helpers/error/statusErro";

throw ErroPersonalizado.criar({
  mensagem: "Email não encontrado",
  status: StatusErro.erroNaoEncontrado,
});
```

### Erro com Múltiplas Mensagens

```typescript
throw ErroPersonalizado.criar({
  mensagem: "Dados inválidos",
  status: StatusErro.erroParametro,
  erros: [
    "Email é obrigatório",
    "Senha deve ter no mínimo 6 caracteres",
    "Nome é obrigatório",
  ],
});
```

### Erro com Dados Extras

```typescript
throw ErroPersonalizado.criar({
  mensagem: "Validação falhou",
  status: StatusErro.erroParametro,
  erros: ["Campo formato inválido"],
  extra: {
    campo: "formato",
    valorRecebido: "invalid_format",
    valoresPermitidos: ["Commander", "Standard", "Modern"],
  },
});
```

## Formato da Resposta de Erro

Quando um erro é lançado, a API retorna uma resposta no seguinte formato:

```json
{
  "mensagem": "Mensagem principal do erro",
  "erros": ["Detalhes específicos do erro 1", "Detalhes específicos do erro 2"],
  "extra": {
    "campo": "valor adicional"
  }
}
```

### Exemplo: Erro 400 (Validação)

**Request:**

```
POST /usuario/cadastrar
{
  "email": "email-invalido",
  "senha": "123"
}
```

**Response (400):**

```json
{
  "mensagem": "Dados inválidos",
  "erros": [
    "Nome é obrigatório",
    "Email deve ser um endereço válido",
    "Senha deve ter no mínimo 6 caracteres"
  ]
}
```

### Exemplo: Erro 401 (Não Autorizado)

**Request:**

```
POST /deck/cadastrar
Authorization: Bearer token_invalido
```

**Response (401):**

```json
{
  "mensagem": "Token inválido ou expirado",
  "erros": ["Faça login novamente"]
}
```

### Exemplo: Erro 403 (Proibido)

**Request:**

```
DELETE /deck/excluir/deck-id-de-outro-usuario
Authorization: Bearer token_valido
```

**Response (403):**

```json
{
  "mensagem": "Você não tem permissão para excluir este deck",
  "erros": ["Apenas o proprietário pode excluir o deck"]
}
```

### Exemplo: Erro 404 (Não Encontrado)

**Request:**

```
PUT /deck/atualizar/id-inexistente
```

**Response (404):**

```json
{
  "mensagem": "Deck não encontrado",
  "erros": []
}
```

### Exemplo: Erro 500 (Erro do Servidor)

**Response (500):**

```json
{
  "mensagem": "Erro interno do servidor",
  "erros": ["Tente novamente mais tarde"]
}
```

## Boas Práticas

1. **Seja específico**: Use mensagens claras e descritivas
2. **Use o status correto**: Facilita o debug e tratamento no cliente
3. **Não exponha detalhes sensíveis**: Evite expor informações de sistema em produção
4. **Use o array erros**: Para listar múltiplos problemas de validação
5. **Campo extra opcional**: Use apenas quando necessário fornecer contexto adicional

## Tratamento no Cliente

Exemplo de como tratar erros no frontend:

```javascript
try {
  const response = await fetch("/usuario/cadastrar", {
    method: "POST",
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    const erro = await response.json();

    // Exibir mensagem principal
    console.error(erro.mensagem);

    // Exibir erros específicos
    if (erro.erros && erro.erros.length > 0) {
      erro.erros.forEach((e) => console.error(e));
    }

    // Processar dados extras se disponíveis
    if (erro.extra) {
      console.log("Detalhes:", erro.extra);
    }
  }
} catch (error) {
  console.error("Erro de rede:", error);
}
```

## Referências

- [ErroPersonalizado.ts](../src/helpers/error/ErroPersonalizado.ts)
- [statusErro.ts](../src/helpers/error/statusErro.ts)
