# Posts

Feed de imagens com publicação administrativa e interação dos usuários.

## Fluxo de publicação

1. O admin solicita uma URL pré-assinada em `POST /imagem/upload-url` para cada imagem.
2. Envia cada arquivo diretamente ao S3 usando `uploadUrl`.
3. Cria o post com as `urlPublica` retornadas.

## Endpoints

### `POST /post` (admin)

Body: `{ "legenda": "texto opcional", "imagens": ["https://..."] }`. Aceita uma ou mais imagens, sem limite funcional, e legenda de até 2200 caracteres. Retorna `201`.

### `GET /post?limite=20&offset=0` (público, JWT opcional)

Retorna `{ posts, total, limite, offset }`, em ordem do mais recente. O limite padrão é 20. Cada item contém apenas as 10 primeiras imagens e informa `totalImagens`, além de autor, comentários, `totalCurtidas` e `curtidoPorMim`.

### `GET /post/:postId` (público, JWT opcional)

Retorna o post completo com todas as imagens.

### `PUT /post/:postId` (admin)

Substitui legenda e lista de imagens. Imagens removidas da lista são excluídas do bucket S3.

### `POST /post/:postId/comentario` (autenticado)

Body: `{ "texto": "comentário" }`, com até 1000 caracteres. Retorna `201`.

### `POST /post/:postId/curtida` (autenticado)

Curte o post. A operação é idempotente.

### `DELETE /post/:postId/curtida` (autenticado)

Remove a curtida. A operação é idempotente.

### `DELETE /post/:postId` (admin)

Exclui o post, seus comentários e suas curtidas.
