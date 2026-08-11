# Upload de Imagens

## Descrição

Fluxo de upload de imagens diretamente para o AWS S3 via **presigned URL**. A API gera uma URL temporária assinada que permite o cliente fazer o upload diretamente ao S3 sem passar pelo servidor.

Tipos aceitos: `image/jpeg`, `image/png`, `image/gif`, `image/webp`  
Tamanho máximo: **5 MB**  
Validade da URL: **5 minutos**

---

## Fluxo de Upload

```
1. Cliente → POST /imagem/upload-url  →  API
2. API  →  URL assinada (uploadUrl) + URL pública (urlPublica)  →  Cliente
3. Cliente → PUT {uploadUrl} com o arquivo binário  →  S3 (direto)
4. Cliente usa {urlPublica} nos campos como `bannerUrl` do torneio
```

> **Nota:** O `PUT` para o S3 deve incluir o header `Content-Type` com o mesmo valor enviado na etapa 1. **Não** enviar o header `Authorization` nessa requisição.
> **Importante:** para uploads diretos pelo navegador funcionarem, o bucket S3 precisa ter CORS habilitado para a origem do frontend e para o método `PUT`.

---

## Endpoint

### POST /imagem/upload-url

Gera uma presigned URL para upload de imagem no S3.

**Requer autenticação JWT.**

**Headers:**

```
Authorization: Bearer {token}
```

**Request Body:**

```json
{
  "contentType": "image/jpeg",
  "tamanhoBytes": 204800
}
```

| Campo        | Tipo   | Obrigatório | Descrição                                                      |
| ------------ | ------ | ----------- | -------------------------------------------------------------- |
| contentType  | string | Sim         | Tipo MIME da imagem: `image/jpeg`, `image/png`, `image/gif`, `image/webp` |
| tamanhoBytes | number | Sim         | Tamanho exato do arquivo em bytes. Mínimo: 1. Máximo: 5242880 (5 MB) |

**Response 200:**

```json
{
  "uploadUrl": "https://bucket.s3.us-east-1.amazonaws.com/imagens/user-1/abc123.jpeg?X-Amz-Algorithm=...&X-Amz-Signature=...",
  "urlPublica": "https://bucket.s3.us-east-1.amazonaws.com/imagens/user-1/abc123.jpeg",
  "chave": "imagens/user-1/abc123.jpeg"
}
```

| Campo      | Tipo   | Descrição                                                              |
| ---------- | ------ | ---------------------------------------------------------------------- |
| uploadUrl  | string | URL assinada para `PUT` direto ao S3. Expira em 5 minutos              |
| urlPublica | string | URL permanente da imagem após o upload ser concluído                   |
| chave      | string | Caminho da imagem no bucket (`imagens/{usuarioId}/{uuid}.extensao`)    |

**Erros:**

| Status | Mensagem                                                              | Causa                             |
| ------ | --------------------------------------------------------------------- | --------------------------------- |
| 400    | contentType deve ser image/jpeg, image/png, image/gif ou image/webp  | Tipo MIME inválido                |
| 400    | tamanhoBytes deve ser maior que 0                                     | Tamanho zero ou negativo          |
| 400    | tamanhoBytes não pode exceder 5 MB                                    | Arquivo maior que 5 MB            |
| 401    | Token não informado / Token inválido ou expirado                      | Sem autenticação                  |
| 429    | Limite de uploads atingido. Tente novamente em 15 minutos            | Rate limit: 10 uploads / 15 min   |

---

## Como fazer o upload após receber a URL

```http
PUT {uploadUrl}
Content-Type: image/jpeg

<bytes do arquivo>
```

Após o `PUT` retornar `200 OK`, a imagem estará disponível em `urlPublica`.

Em navegador, o `Content-Length` é enviado automaticamente quando aplicável. O cliente só precisa garantir que o `Content-Type` usado no upload seja o mesmo informado ao gerar a URL.

Se o navegador retornar erro de CORS no `PUT`, configure o bucket com uma regra equivalente a esta:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["https://app.tiagofuguete.com.br"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Exemplo com AWS CLI:

```bash
aws s3api put-bucket-cors \
  --bucket "$AWS_S3_BUCKET" \
  --cors-configuration file://cors.json
```

---

## Validação de URLs de imagem

Campos que aceitam URL de imagem (ex: `bannerUrl` em torneios) **rejeitam** qualquer URL que não pertença ao bucket S3 configurado. Uma URL de origem externa retorna:

```json
{
  "mensagem": "Erro de validação.",
  "erros": ["A URL da imagem deve pertencer ao bucket S3 autorizado."]
}
```

---

## Rate Limit

| Janela     | Máximo de requisições |
| ---------- | --------------------- |
| 15 minutos | 10 por usuário        |

---

## Configuração (variáveis de ambiente)

| Variável       | Descrição                              | Padrão         |
| -------------- | -------------------------------------- | -------------- |
| AWS_S3_BUCKET  | Nome do bucket S3                      | _(obrigatório)_ |
| AWS_S3_REGION  | Região AWS do bucket                   | `us-east-1`    |
