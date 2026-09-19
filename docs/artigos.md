# Artigos (blog)

API de artigos editoriais (separada da comunidade `/post`).

## Papéis

| Role | Pode |
|------|------|
| `admin` | Criar/publicar na hora, aprovar/rejeitar, excluir, definir editores |
| `editor` | Criar e editar (próprios); fica `pendente` até aprovação |
| `user` | Ler publicados, comentar, curtir |

## Endpoints

| Método | Path | Auth |
|--------|------|------|
| GET | `/artigo` | opcional; `?pendentes=true` (admin) |
| POST | `/artigo` | editor/admin |
| GET | `/artigo/:artigoId` | opcional; incrementa visualizações se publicado |
| PUT | `/artigo/:artigoId` | editor (autor) / admin |
| POST | `/artigo/:artigoId/aprovacao` | admin `{ aprovar: boolean }` |
| DELETE | `/artigo/:artigoId` | admin |
| POST | `/artigo/:artigoId/comentario` | JWT |
| POST/DELETE | `/artigo/:artigoId/curtida` | JWT |
| PUT | `/usuario/:usuarioId/editor` | admin `{ editor: boolean }` |

## Conteúdo

Corpo do artigo em texto (markup Cards Realm) gravado no S3 (`artigos/{id}/conteudo*.txt`). Metadados no DynamoDB (`PK=ARTIGOS`, `SK=ARTIGO#{id}`).

Markup: `[[Carta]]`, `[cardinfo]{Carta}`, `[cardside](...)`, `[h1]{...}`, `[deck](id)`.

Status: `pendente` (novo), `pendente_edicao` (já publicado com revisão aguardando — público continua vendo a versão anterior), `publicado`, `rejeitado`.
