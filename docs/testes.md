# Testes

## Execucao completa

O comando abaixo executa primeiro os testes unitarios e depois todos os E2E, sempre em serie para evitar concorrencia entre fixtures e tabelas compartilhadas:

```powershell
npm test
```

O fluxo completo inclui o torneio de 150 jogadores e pode levar cerca de 15 minutos. Os E2E usam os valores do arquivo `.env` e acessam tabelas DynamoDB reais na AWS.

## Pre-requisitos

- Credenciais AWS validas, preferencialmente por `AWS_PROFILE`.
- `DYNAMODB_DATA_TABLE` apontando para uma tabela cujo nome contenha `local` ou `test`.
- `DYNAMODB_CACHE_TABLE` apontando para a tabela de cache que sera exercitada.
- Regiao configurada em `DYNAMODB_DATA_REGION` e `DYNAMODB_CACHE_REGION`.
- Cache habilitado por `DYNAMODB_CACHE_ENABLED=true`.

Use apenas uma fonte de credenciais. Se `AWS_PROFILE` estiver definido, remova `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` e `AWS_SESSION_TOKEN` do ambiente para evitar ambiguidade no AWS SDK.

## Comandos

```powershell
# Testes unitarios, sem acesso a AWS
npm run test:unit

# Todos os E2E em serie
npm run test:e2e

# Operacoes e invalidacao do cache DynamoDB
npm run test:e2e:cache

# Paginacao e batch write da tabela de dados
npm run test:e2e:dynamodb

# Coerencia da visao do cliente durante mutacoes do torneio
npm run test:e2e:torneio-cache

# Fluxo completo Swiss com 150 jogadores, late entry, drops e Top 8
npm run test:e2e:torneio150
```

`npm run test:watch` e `npm run test:coverage` executam somente testes unitarios.

## Seguranca e limpeza

Os testes da tabela de dados recusam nomes que nao contenham `local` ou `test`. Os testes de cache usam chaves isoladas e os fluxos removem suas fixtures ao terminar. O agregador permite a tabela de cache configurada porque o ambiente local pode compartilhar o cache de desenvolvimento; durante a execucao, particoes de cache relacionadas a torneios, ligas e metagame podem ser invalidadas.

Para acompanhar o torneio no frontend, configure `E2E_STEP_DELAY_MS` com uma pausa em milissegundos. Para preservar fixtures temporariamente, use `E2E_KEEP_DATA=true`; restaure para `false` depois da inspecao para nao acumular dados de teste.

## Migracao MongoDB para DynamoDB

O migrador usa `MONGODB_MIGRATION_URI` e `MONGODB_MIGRATION_DB_NAME` somente como origem e `DYNAMODB_DATA_TABLE` como destino. Neste projeto, configure `MONGODB_MIGRATION_DB_NAME=test`. Partidas e inscricoes cujo torneio nao exista na origem sao ignoradas. IDs de torneios inexistentes tambem sao removidos das ligas migradas.

```powershell
# Confere colecoes, contagens e partidas orfas sem gravar
npm run db:migrate-dynamodb:dry-run

# Limpa a tabela local/teste e migra novamente
npm run db:migrate-dynamodb:reset
```

`--truncate` somente aceita tabelas cujo nome contenha `local` ou `test`. Antes de apagar o destino, o script conecta na origem e exige as colecoes `usuarios`, `torneios` e `partidas`, alem de pelo menos um torneio. Para escolher colecoes sem limpar a tabela, use `npm run db:migrate-dynamodb -- --only=usuarios,torneios`.

Durante o reset, o script informa o progresso a cada 500 itens removidos e a cada 100 documentos lidos por colecao. Depois de `Origem validada`, ele pode permanecer alguns segundos trabalhando no primeiro lote; aguarde as mensagens de progresso e nao interrompa o processo durante o truncate.

## Garantias DynamoDB para homologacao

- Entidades com indices duplicados sao gravadas e removidas por `TransactWriteItems`.
- E-mail possui indice unico protegido por condicao atomica.
- Torneios e partidas usam `version` para rejeitar atualizacoes concorrentes sobre dados antigos.
- Contadores de visualizacoes e resultados expressivos usam `ADD` atomico.
- O rate limiter usa a tabela de cache como armazenamento compartilhado entre instancias; sem `DYNAMODB_CACHE_TABLE`, usa memoria apenas para desenvolvimento/testes unitarios.
- A tabela de dados tem Point-in-Time Recovery habilitado.
- As tabelas possuem `DeletionPolicy: Retain` e `UpdateReplacePolicy: Retain` para impedir perda automatica de dados em exclusao ou substituicao da stack.
- Alarmes monitoram erros da Lambda e throttling nas tabelas de cache e dados.

`DeletionPolicy: Retain` mantem a tabela existente quando o recurso sai do template ou a stack e excluida. `UpdateReplacePolicy: Retain` mantem a tabela antiga quando uma alteracao obriga o CloudFormation a criar outra tabela para substitui-la. Em ambos os casos, a tabela preservada deixa de ser gerenciada automaticamente pela stack e sua remocao posterior deve ser deliberada.
