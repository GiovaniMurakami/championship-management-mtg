# Índice da Documentação

## Começando

- [README](./README.md) - Visão geral, configuração e arquitetura do projeto

## Documentação por Entidade

### [Usuário](./usuario.md)

- Estrutura da entidade
- Endpoints de cadastro e autenticação
- Regras de negócio
- Casos de uso e repositórios

### [Deck](./deck.md)

- Estrutura da entidade
- Endpoints CRUD
- Regras de negócio e validações
- Autenticação e autorização
- Casos de uso e repositórios

### [Torneio](./torneio.md)

- Estrutura das entidades (Torneio, Inscrição, Partida)
- Fluxo completo do torneio
- Sistema Swiss com critérios de desempate WotC
- Endpoints: criar, listar, buscar, listar partidas, inscrever, check-in, escolher deck, drop, iniciar, resultado, próxima rodada, standings, meu histórico
- Campo `premio` e `maxJogadores` no torneio
- Requisito de `nickMTGO` para inscrição
- Contagem de inscritos e check-in (`totalInscritos`, `totalCheckin`)
- Nomes populados em standings e partidas
- Notificações em tempo real via Ably (7 eventos)

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
