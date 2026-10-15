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

# Campeonato multi-dia (Day 1 → pausado → Day 2) com personas mapeadas
npm run test:e2e:campeonato-multidia

# Suíte leve usada no gate de deploy homolog (publicar-rodada + multi-dia)
npm run test:e2e:ci
```

`npm run test:watch` e `npm run test:coverage` executam somente testes unitarios.

## E2E no deploy (homolog)

O workflow `.github/workflows/deployHomolog.yml` roda unitários e `npm run test:e2e:ci` **antes** do deploy. O job E2E usa OIDC no Environment `homolog` e grava só em tabelas de teste.

Configure no GitHub → Settings → Environments → **homolog** → Variables:

| Variable | Exemplo | Regra |
|---|---|---|
| `E2E_DYNAMODB_DATA_TABLE` | `championship-management-mtg-local-data` | nome deve conter `local` ou `test` |
| `E2E_DYNAMODB_CACHE_TABLE` | `championship-management-mtg-local-cache` | idem |

Secrets já usados: `JWT_SECRET`, `AWS_ROLE_TO_ASSUME`.

A role OIDC precisa de DynamoDB (leitura/escrita/scan/batch) nessas tabelas E2E. **Não** aponte para `*-dev-data` / `*-prod-data`.

O `torneio150` (~15 min) fica fora do gate; rode localmente ou em workflow manual se necessário.

## E2E multi-dia e personas

Arquivos:

- `tests/e2e/support/personasCampeonato.ts` — personas, roteiro de mesas e pontos esperados
- `tests/e2e/fluxoCampeonatoMultiDia.e2e.test.ts` — fluxo HTTP contra DynamoDB

### Personas (8 jogadores + organizador)

| Chave | Nome | Papel | Day 2? | Comportamento |
|---|---|---|---|---|
| `org` | Org MultiDia E2E | organizador/admin | — | cria torneio, força pareamentos, ajusta contestação, encerra Day 1 |
| `ana_campea` | Ana Campeã | campeã | sim | vence Day 1 e Day 2; confirma resultados |
| `bruno_vice` | Bruno Vice | vice | sim | avança; empata na R3; perde a “final” R4 para Ana |
| `carla_empate` | Carla Empate | empatadora | sim | avança; empata R3 com Bruno; perde R4 |
| `diego_contesta` | Diego Contesta | contestador | sim | na R3 reporta placar errado; Ana contesta; admin ajusta |
| `elena_corte` | Elena Corte | corte Day 1 | não | perde Day 1 e é dropada no `encerrar-day1` |
| `fabio_corte` | Fábio Corte | corte Day 1 | não | idem |
| `gabi_corte` | Gabi Corte | corte Day 1 | não | idem |
| `hugo_corte` | Hugo Corte | corte Day 1 | não | idem |

### Roteiro de rodadas

Config: `maxRodadas=4`, `rodadasDay1=2`, `vagasDay2=4`.

| Rodada | Fase | Mesas (forçadas) | Resultado |
|---|---|---|---|
| 1 | Day 1 | Ana×Hugo, Bruno×Gabi, Carla×Fábio, Diego×Elena | 4 vitórias dos favoritos (3 pts) |
| 2 | Day 1 | Ana×Elena, Bruno×Fábio, Carla×Gabi, Diego×Hugo | favoritos 6 pts; cortes 0 |
| — | Corte | `POST .../encerrar-day1` | status `pausado`; 4 classificados; 4 dropados |
| 3 | Day 2 | Diego×Ana (contesta→ajuste Ana vence), Bruno×Carla (empate 1-1) | Ana 9; Bruno/Carla 7; Diego 6 |
| 4 | Day 2 | Ana×Bruno (Ana vence), Diego×Carla (Diego vence) | Ana 12 → campeã; Diego 9 |

Pareamentos são reescritos com `PUT /torneio/:id/rodada/:r/pareamentos` para o teste ser determinístico (Swiss aleatório da R1 não influencia o mapa).

**Standings:** com torneio `em_andamento`, a rodada vigente só entra nos pontos depois de `proxima-rodada` (ou após `encerrar-day1` / `finalizado`). O E2E valida placares na rodada corrente via `/partidas` e pontos consolidados nos momentos certos.

## Coverage

O Vitest usa o provider V8 e falha automaticamente se o coverage global ficar abaixo destes limites:

- statements: 95%
- functions: 95%
- lines: 95%
- branches: 90%

Execute `npm run test:coverage` antes de enviar alteracoes. O limite separado de branches considera a quantidade elevada de defaults, encadeamentos opcionais e caminhos defensivos do dominio; ele nao reduz a meta de 95% aplicada as demais metricas.

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
