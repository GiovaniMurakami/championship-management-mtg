# Documentação da API - Championship Management MTG

## Visão Geral

API para gerenciamento de campeonatos de Magic: The Gathering.

## Documentação por Entidade

A documentação completa está organizada por entidade:

- **[Usuário](./usuario.md)** - Autenticação, cadastro e gerenciamento de usuários
- **[Deck](./deck.md)** - CRUD de decks de Magic: The Gathering
- **[Torneio](./torneio.md)** - Criação e gerenciamento de torneios com sistema Swiss
- **[Liga](./liga.md)** - Agrupamento de torneios e rankings consolidados (admin)
- **[Time](./time.md)** - Criação e gerenciamento de equipes com fluxo de convite/solicitação

## Resumo dos Endpoints

### Autenticação (Público)

- `POST /usuario/cadastrar` - Cadastrar novo usuário
- `POST /usuario/login` - Fazer login e obter token JWT

### Usuário (🔒 JWT obrigatório)

- `PUT /usuario/atualizar` - Atualizar dados do usuário (telefone, nicks MTGO/Arena)

### Decks (🔒 JWT obrigatório)

- `GET /deck/listar` - Listar todos os decks do usuário
- `POST /deck/cadastrar` - Cadastrar novo deck
- `PUT /deck/atualizar/:id` - Atualizar deck existente
- `DELETE /deck/excluir/:id` - Excluir deck

### Torneios (🔒 JWT obrigatório)

- `POST /torneio/criar` - Criar novo torneio (aceita campo opcional `premio`)
- `GET /torneio/listar` - Listar todos os torneios (aceita `?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD` para filtrar pelo `horario`)
- `GET /torneio/:torneioId` - Buscar torneio por ID (inclui `partidas` com nomes, `totalInscritos`, `totalCheckin`)
- `GET /torneio/:torneioId/partidas` - Listar partidas do torneio com IDs e nomes dos jogadores (aceita `?rodada=N`)
- `POST /torneio/:torneioId/inscrever` - Inscrever-se em um torneio
- `POST /torneio/:torneioId/checkin` - Fazer check-in (pré-torneio ou entre rodadas)
- `POST /torneio/:torneioId/deck` - Escolher deck para o torneio
- `POST /torneio/:torneioId/iniciar` - _(dono)_ Iniciar torneio e gerar rodada 1
- `POST /torneio/partida/:partidaId/resultado` - Registrar resultado de partida
- `POST /torneio/:torneioId/proxima-rodada` - _(dono)_ Avançar rodada ou finalizar
- `POST /torneio/:torneioId/drop` - Dropar jogador
- `GET /torneio/:torneioId/standings` - Ver classificação atual (inclui `nome` e `deckNome`)
- `GET /torneio/:torneioId/meu-historico` - Ver histórico de partidas do jogador autenticado

### Ligas (🔒 JWT obrigatório)

- `POST /liga/criar` - _(admin)_ Criar nova liga
- `GET /liga/listar` - Listar todas as ligas
- `GET /liga/:id` - Buscar liga por ID
- `PUT /liga/:id` - _(admin)_ Atualizar liga
- `DELETE /liga/:id` - _(admin)_ Excluir liga
- `GET /liga/:id/ranking` - Ranking da liga (jogadores, decks, cartas; times se `tipo=times`)

### Times (🔒 JWT obrigatório)

- `POST /time/criar` - Criar novo time
- `GET /time/listar` - Listar todos os times
- `GET /time/:id` - Buscar time por ID
- `PUT /time/:id` - _(dono)_ Atualizar time
- `DELETE /time/:id` - _(dono)_ Excluir time
- `POST /time/:id/entrar` - Entrar no time diretamente
- `POST /time/:id/sair` - Sair do time
- `POST /time/:id/gerar-convite` - _(dono)_ Gerar token de convite
- `POST /time/:id/entrar-por-convite` - Entrar via token de convite
- `POST /time/:id/solicitar` - Solicitar entrada no time
- `POST /time/:id/aprovar` - _(dono)_ Aprovar solicitação
- `POST /time/:id/rejeitar` - _(dono)_ Rejeitar solicitação

> **⚠️ Importante:** Todos os endpoints marcados com 🔒 requerem token JWT no header `Authorization: Bearer {token}`

## Arquitetura

O projeto segue os princípios de **Clean Architecture** e **Domain-Driven Design (DDD)**:

```
src/
├── dominio/           # Camada de domínio (entidades e interfaces)
├── casosDeUso/        # Casos de uso (regras de negócio)
├── infra/             # Infraestrutura (API, banco de dados)
├── middlewares/       # Middlewares (autenticação, validação)
└── helpers/           # Utilitários e tratamento de erros
```

### Camadas

- **Domínio**: Entidades de negócio e interfaces (gateways)
- **Casos de Uso**: Lógica de aplicação independente de framework
- **Infraestrutura**: Implementações técnicas (Express, MongoDB)
- **Middlewares**: Interceptadores de requisições

## Tecnologias

- **Node.js** + **TypeScript**
- **Express** - Framework web
- **MongoDB** + **Mongoose** - Banco de dados
- **JWT** - Autenticação
- **bcryptjs** - Criptografia de senhas
- **CORS** - Controle de acesso entre origens
- **AWS Lambda** + **Serverless** - Deploy em nuvem

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
MONGODB_URI=sua_connection_string_mongodb
JWT_SECRET=seu_secret_jwt
PORT=3000
```

## Executando Localmente

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```
