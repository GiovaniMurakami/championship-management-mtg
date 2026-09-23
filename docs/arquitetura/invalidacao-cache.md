# Escritas e invalidação de cache

## Estado da aplicação

Em `src/composicao/casos.ts`, somente o metagame recebe o serviço de cache.
Classificação, partidas, listagem de torneios, SEO, ranking de liga e anúncios
possuem suporte ao cache, mas continuam sem recebê-lo na composição. Esta mudança
não os reativa. `DYNAMODB_CACHE_ENABLED=true` sozinho não ativa esses consumidores.

## Mapa de dependências

A invalidação ocorre nos métodos de persistência, após cada escrita concluída,
antes de devolver o controle ao caso de uso. Não depende de uma rota HTTP nem da
emissão de um evento do Ably. Alterações em cascata usam a mesma camada.

| Repositório / domínio | Pontos de escrita cobertos | Respostas invalidadas |
| --- | --- | --- |
| Torneio | salvar, atualizar, excluir, atualizarECriarPartidas, removerAnfitriaoDoUsuario; criação, alteração, anfitrião, início/fim, corte, próxima/refazer rodada, total de rodadas | Todos os caches de torneio, listagem, ranking e metagame |
| Inscrição | salvar, atualizar, excluir, excluirPorUsuario; inscrição, ingresso por link, check-in, escolha/troca de deck, drop/desdrop, byes | Todos os caches de torneio, listagem, ranking e metagame |
| Partida | salvar, salvarVarias, reconciliarRodada, atualizar, finalizarAtomicamente, contestarPartida, ajustarResultadoContestado, atualizarJogador2Partida, excluirPorTorneioERodada, excluirPorIds, confirmarResultado, atualizarMesa | Todos os caches de torneio (incluindo todas as variantes de rodada), ranking e metagame |
| Usuário | salvar, atualizar, excluir, incrementarResultadosExpressivos; nome, nick, bloqueio, perfil, exclusão e resultados expressivos | Todos os caches de torneio, ranking e metagame |
| Deck | salvar, atualizar, excluir, excluirPorUsuario; criação, cópia, nome, arquétipo, cartas e exclusão | Todos os caches de torneio, ranking e metagame |
| Time | salvar, atualizar, excluir; nome, imagem, membros, dono, convites e solicitações | Todos os caches de torneio e ranking |
| Liga | salvar, atualizar, excluir; regras e associação/remoção de torneios | Ranking de todas as ligas e todas as variantes de filtros |
| Site | salvarAnuncios, registrarCliqueAnuncio | Anúncios públicos e administrativos |
| Visualizações de torneio | incrementarVisualizacoes | Somente listagem de torneios, que expõe esse contador |
| Visualizações de deck | incrementarVisualizacoes | Nenhum dos caches atuais expõe esse contador |
| Autenticação | blacklist, refresh token, tentativas de login, reset de senha, links de ingresso | Sem resposta de negócio em cache; o ingresso efetivo passa por inscrição/partida/deck |
| Posts e fundos de story | criação, edição, exclusão, comentários e curtidas | Sem consumidor de cache DynamoDB |
| Rate limit | incremento, decremento, reset, remoção de janela expirada | Não é cache de resposta; não invalida dados de negócio |
| Migração | gravações pelos repositórios e lotes do `--truncate` | Repositórios invalidam seus domínios; truncate invalida todos os domínios de dados a cada lote |
| S3 | upload e exclusão de imagens | Cache DynamoDB depende dos metadados salvos pelos repositórios acima; não altera caches de CDN/navegador |

Os métodos `putJson`, `delete`, `updatePayloadIf`, `batchWrite`,
`transactWriteRequests`, `transactWrite` e `transactPutJson` centralizam a cobertura.
Novos repositórios com respostas em cache devem declarar seu domínio no `super()`
e atualizar `dependenciasCache.ts`. Novos caminhos de escrita direta no SDK devem
seguir o mesmo contrato. Scripts externos/edições pelo console não são interceptados.

## Versões e consultas simultâneas

A tabela de cache possui um item `pk=__cache_versions, sk=v1`, sem TTL, com uma
versão por domínio. Uma invalidação atualiza somente os atributos dos domínios
atingidos. Não varre partições nem exclui cada variante de resposta.

Cada consulta captura as versões das dependências **antes** de buscar os dados.
Um item só é reutilizado se suas versões corresponderem às capturadas. Tanto a
versão quanto o payload usam leitura consistente. Na gravação de um cálculo,
as versões são verificadas novamente; se mudaram, o cálculo não vai para o cache.
Se ocorrer uma invalidação entre essa verificação e o Put, o item ainda carrega a
versão antiga e será rejeitado pelas consultas seguintes. Isso também funciona
entre instâncias distintas da Lambda, sem estado compartilhado em memória.

Itens antigos sem versão são tratados como miss. O TTL continua removendo os
payloads vencidos. Não se apaga um item expirado durante a leitura, pois isso
poderia apagar uma resposta mais recente gravada por outra instância.

## Falhas e limites

- Falha de leitura/armazenamento do cache: a consulta usa os dados de origem; uma
  versão indisponível impede armazenar o cálculo como se estivesse validado.
- Falha ao invalidar após escrita: log de erro e rejeição da operação, sem anunciar
  sucesso ou emitir o evento posterior do caso de uso. **Os dados já podem ter sido
  persistidos**; a escrita e a versão são operações separadas. Uma interrupção da
  Lambda entre elas também deixa uma janela até expirar o payload. Para eliminar
  essa janela seria necessário acoplar as versões às transações de dados ou adotar
  um mecanismo durável de recuperação; esta mudança não promete atomicidade entre
  as duas tabelas. Não repetir mutações não idempotentes sem consultar seu estado.
- O filtro existente de alarmes de cache inclui as falhas de leitura de versão e
  invalidação. A mudança no filtro só entra em vigor após deploy da infraestrutura.
- A invalidação é conservadora **por domínio**, não por torneio ou jogador. Uma
  escrita em um torneio invalida também snapshots de outros torneios. Isso cobre
  dependências cruzadas sem varrer inscrições, ao custo de mais misses. Futuras
  otimizações podem segmentar domínios depois de medir a taxa de acertos.
- O item de versões é compartilhado por todos os consumidores da mesma tabela de
  cache. Aplicações/dados independentes devem usar tabelas de cache independentes.
- Há uma atualização de versão por escrita de repositório; um hit usa leitura de
  versão + payload; um miss faz outra leitura de versão antes do Put. O objetivo
  desta alteração é correção, não uma redução de custo garantida.
- O cache do navegador/React Query é independente. Invalidar no servidor não faz
  uma aba já aberta consultar automaticamente. Os eventos existentes continuam
  responsáveis pela atualização ao vivo.
- Reativar consumidores, ou habilitar cache após escritas feitas com cache
  desabilitado, exige invalidar os domínios no rollout e validar o fluxo completo.
  Instâncias executando a versão antiga também não participam deste contrato.

## Validação local

Execute `npm run test:cache`. A suíte possui 80 testes em três arquivos:

- `tests/infra/cache/invalidacaoEscritas.test.ts`: 26 testes da camada de escrita,
  domínios e versões.
- `tests/infra/cache/operacoesTorneio.test.ts`: 38 cenários com casos de uso e
  repositórios DynamoDB reais, exercitando as operações abaixo.
- `tests/infra/cache/concorrenciaTorneio.test.ts`: 16 testes de concorrência,
  falhas, TTL, isolamento e composição da aplicação.

Cada cenário de operação aquece **15 respostas**: standings, partidas de todas as
rodadas e das rodadas 1/2/3, quatro variantes de listagem (incluindo usuário,
status e paginação), SEO, duas variantes de ranking de liga e metagame de
7/30/90 dias. A segunda instância precisa acertar o cache antes da mutação;
somente o SEO consulta o registro de origem para resolver o ID antes do hit.
Depois da operação, a versão precisa mudar e as respostas precisam ser iguais
às calculadas sem cache, sem esperar o TTL. Para operações que alteram as
respostas observadas, o teste também exige diferença em relação ao snapshot
anterior. O cache independente de anúncios deve continuar válido.

| Grupo | Operações exercitadas |
| --- | --- |
| Administração | Criar, editar nome/banner/YouTube, remover YouTube, definir/remover anfitrião, alterar exibição do nome, tornar secreto, excluir |
| Inscrição | Inscrever, check-in inicial/da rodada, escolher e clonar deck, remover inscrição, ingresso tardio com deck e bye de penalidade |
| Partidas | Registrar, confirmar, contestar, ajustar resultado, alterar mesa, trocar pareamentos, substituir partidas removendo IDs antigos |
| Participantes | Drop com WO, desdrop com reabertura, remoção em lote sem deck e drop em lote sem check-in |
| Rodadas | Iniciar torneio, avançar Swiss, ajustar total, refazer rodada, iniciar Top 4, avançar semifinal, finalizar corte, refazer primeira rodada do corte |
| Finalização | Encerramento manual e automático, entrada dos resultados no metagame e ranking da liga |
| Dependências externas | Nome do jogador, nome do time, arquétipo e cartas de deck usado no torneio |

Os testes adicionais verificam consultas antigas concluídas após o encerramento,
invalidação entre validação e Put, espera da invalidação antes do evento de
sucesso, falhas de leitura/gravação, rejeição por permissão, conflito de versão,
check-in repetido, cache legado sem versão, payload corrompido, TTL, detalhe do
arquétipo com limite de listas, geração de link sem invalidar e isolamento de
partidas externas do perfil. Há um teste usando a composição real para confirmar
que o encerramento invalida o metagame que está ativo na aplicação.

### Falha de invalidação reproduzida

O teste `documenta janela residual: falha após persistência deixa metagame antigo
até nova invalidação` demonstra uma limitação ainda presente:

1. Aquece o metagame com um torneio em andamento, que não aparece no agregado.
2. Encerra o torneio e simula falha na atualização das versões do cache.
3. Confirma que o banco já contém `finalizado`, a operação retorna erro e nenhum
   evento de sucesso é emitido.
4. A consulta sem cache inclui o torneio; o metagame da composição real ainda
   devolve o agregado antigo.
5. Uma invalidação posterior restaura o resultado atualizado.

Esse teste passa ao **reproduzir o risco**, e não significa que ele foi corrigido.
Eliminar a janela exige escrita e invalidação atômicas ou recuperação durável,
como descrito em “Falhas e limites”. Nos 38 cenários concluídos com sucesso,
a leitura após a operação correspondeu à origem.

### Alcance da simulação

`support/dynamoMemoria.ts` intercepta o SDK, persiste itens e índices em memória,
aplica condições de status/versão e verifica as condições da transação antes de
gravar. Comandos e expressões desconhecidos causam erro. As regras de negócio,
repositórios e serviço de cache não são substituídos por mocks.

Os testes não acessam a AWS e não validam IAM, rede, limites de serviço nem o
cache React Query do navegador. Também não prometem snapshots atômicos durante
uma operação de múltiplas escritas. O E2E de nuvem existente é separado e não foi
executado nesta validação; ele pressupõe cache ativo nas consultas de torneio,
que hoje não é injetado pela composição de produção.


## Revisão final do fluxo — 2026-09-06

Revisão local; não foram executados deploy, testes AWS ou observação da sessão do usuário.
Nesta rodada foram alterados apenas testes e documentação, sem corrigir as pendências abaixo.

Validação:
- Suíte unitária completa da API: 129 suítes, 1.021 testes aprovados (antes dos dois cenários adicionais).
- Cache: 82 testes aprovados, agora incluindo edição de prêmio e a sequência ajustar total + iniciar rodada extra.
- Frontend: 23 testes de fluxo, permissões, revisão e sincronização aprovados.
- Os cenários de sucesso aquecem 15 respostas e comparam a leitura posterior à origem. Os testes diagnósticos de falha passam quando reproduzem o problema, não quando o eliminam.

### Pendências encontradas

1. **Alta — cache da API após falha parcial.** Continua reproduzida a janela descrita acima: persistência concluída seguida de falha ao atualizar versões deixa o metagame antigo. O erro é retornado ao cliente. Requer invalidação atômica ou recuperação durável.
2. **Alta — eventos ausentes no transporte realtime.** `refazerRodada` e `desdroparJogador` emitem `rodada_refeita` e `jogador_voltou`; o frontend os assina, mas `NotificacaoAbly.escutarEventos` não os publica. Outros navegadores podem manter rodada/participantes antigos. Definir anfitrião e editar torneio também não notificam quem já está na página (inclui alterações de prêmio/live). A revalidação ao montar só cobre nova entrada.
3. **Média — lista vazia ignorada.** Tanto o efeito da query de partidas quanto `loadPartidas` exigem `length > 0` antes de substituir o estado. Adicionado teste diagnóstico que carrega uma partida, recebe `{ partidas: [] }` na próxima consulta e comprova a permanência da partida antiga. Distinguir resposta vazia válida de erro e substituir o estado também por `[]`.
4. **Média — rodada extra em duas operações.** O frontend aumenta o total e depois inicia a rodada. A sequência de sucesso passou com cache aquecido, mas a segunda operação pode falhar e deixar apenas o total aumentado. Não há rollback nem transação única. Isso é falha parcial de fluxo, não cache atrasado; requer operação única ou recuperação explícita. Risco identificado por inspeção, sem teste de falha da segunda chamada nesta rodada.
5. **Média — falhas de refetch não verificadas.** `loadTournament`, `loadStandings` e `loadPartidas` usam `refetch()` sem verificar `error`/`isError` ou solicitar `throwOnError`. Os blocos catch não garantem detectar uma falha de consulta, e dados anteriores podem continuar visíveis após uma mutação. Requer tratamento explícito e feedback de falha de sincronização.

Outros achados de menor impacto: `total_rodadas_alterado` e `rodada_refeita` são emitidos no caso de uso e novamente na rota; ao publicar o segundo evento no Ably, remover a duplicidade para evitar recargas redundantes. Os setters de `useInvalidateTournament` usam chaves sem o sufixo de autenticação usado pelas queries; atualmente não têm consumidores, mas não atualizarão essas entradas quando usados.

A composição injeta cache nas consultas de metagame; detalhe do torneio lê o repositório diretamente, com leitura consistente. Portanto, cache correto no backend não garante que uma página já aberta atualize sem evento/refetch. Sem logs de uma sessão publicada, não é possível atribuir um incidente específico a uma destas causas.
