# Índice da Documentação

## Começando

- [README](./README.md) - Visão geral, configuração e arquitetura do projeto

## Documentação por Entidade

### [Usuário](./usuario.md)

- Estrutura da entidade (`bloqueadoTorneios`, `excluido`, `excluidoEm`)
- Endpoints de cadastro e autenticação
- `DELETE /usuario/conta` — soft-delete / anonimização (preserva decks e histórico)
- `PUT /usuario/:id/bloqueio-torneios` — bloqueio admin
- `GET /usuario/listar` — busca de usuários (admin; omite excluídos por padrão)
- Regras de negócio
- Casos de uso e repositórios

### [Deck](./deck.md)

- Estrutura da entidade
- Endpoints CRUD
- Regras de negócio e validações
- Autenticação e autorização
- Casos de uso e repositórios

### [Metagame](./metagame.md)

- Lista de arquétipos por formato e janela de dias
- Detalhe: listas, matchups e resultados em torneios
- `GET /metagame` e `GET /metagame/:formato/:slug`
- `usuario.nome` = nick MOL (`nickMTGO`)

### [Torneio](./torneio.md)

- Estrutura das entidades (Torneio, Inscrição, Partida)
- Fluxo completo do torneio
- Sistema Swiss com critérios de desempate WotC
- Endpoints: criar, listar, buscar, listar partidas, inscrever, check-in, escolher deck, drop (auto ou organizador), iniciar, resultado, próxima rodada, standings, meu histórico, **definir anfitrião**, encerrar, ajustar total de rodadas
- Campo `anfitriaoId` / permissões do anfitrião no torneio (`podeGerenciarTorneio`)
- Datas serializadas em horário de Brasília (UTC-3)
- Campo `premio` e `maxJogadores` no torneio
- Requisito de `nickMTGO` para inscrição
- Contagem de inscritos e check-in (`totalInscritos`, `totalCheckin`)
- Nomes populados em standings e partidas; flag `excluido` / `jogadorNExcluido` para contas anonimizadas
- Notificações em tempo real via Ably

### [Liga](./liga.md)

- Estrutura da entidade
- Criação e gerenciamento de ligas (somente admin)
- Associação de torneios a uma liga
- Tipos: `individual` e `times`
- Endpoint de ranking: jogadores, decks, cartas e times (`jogador.nome` = nick MOL)
- Cálculo de pontuação e critérios de ordenação

### [Time](./time.md)

- Estrutura da entidade
- CRUD de times e gerenciamento de membros
- Fluxo de convite por token
- Fluxo de solicitação com aprovação/rejeição pelo dono
- Regras: um usuário por time, dono não pode sair

### [Imagem](./imagem.md)

- Fluxo de upload via presigned URL ao S3
- Endpoint `POST /imagem/upload-url`
- Tipos aceitos, limite de tamanho e validade da URL
- Validação de URLs de imagem em campos de torneio

## Sistema

### [Autenticação JWT](./autenticacao.md)

- Como funciona o JWT
- Fluxo de autenticação
- Como obter e usar tokens
- Middleware de autenticação
- Erros comuns e boas práticas

### [Tratamento de Erros](./erros.md)

- Estrutura de erros personalizada
- Status HTTP e quando usar cada um
- Exemplos de respostas de erro
- Boas práticas
- Tratamento no cliente

## Guias de Desenvolvimento

_(A ser adicionado)_

- Guia de contribuição
- Padrões de código
- Testes
- CI/CD

## Referências

- [Express Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [Serverless Framework](https://www.serverless.com/framework/docs)
- [Magic: The Gathering API](https://docs.magicthegathering.io/)
