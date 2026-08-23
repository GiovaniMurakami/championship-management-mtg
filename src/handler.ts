/* eslint-disable @typescript-eslint/no-explicit-any */
import serverless from "serverless-http";
import { app, inicializarDependenciasDeProcesso } from "./app";
import { NotificacaoAbly } from "./infra/ably/notificacaoAbly";
import { preloadJwtKeys } from "./helpers/jwt";
import { logger } from "./helpers/logger";
import { LAMBDA_BINARY_MEDIA_TYPES } from "./helpers/lambdaBinaryMedia";
import { aguardarInvalidacoesCachePendentes } from "./infra/cache/invalidadorCacheTorneio";
import { criarRepositorios } from "./composicao/repositorios";
import { Ranqueada } from "./casosDeUso/ranqueada/ranqueada";

const aplicacao = app();
// Sem isso, API Gateway devolve JPEG do /imagem/proxy como base64 texto / UTF-8 corrompido.
const serverlessApp = serverless(aplicacao, {
  binary: [...LAMBDA_BINARY_MEDIA_TYPES],
});

const runtimeReady = Promise.all([
  preloadJwtKeys(),
  Promise.resolve().then(() => inicializarDependenciasDeProcesso()),
]);

export const handler = async (event: any, context: any) => {
  try {
    await runtimeReady;
  } catch (error) {
    logger.error({ err: error }, "falha ao inicializar runtime da lambda");
    throw error;
  }

  try {
    const resultado = await serverlessApp(event, context);
    await NotificacaoAbly.aguardarPublicacoesPendentes();
    await aguardarInvalidacoesCachePendentes();
    return resultado;
  } catch (error) {
    logger.error({ err: error, path: event?.path, method: event?.httpMethod }, "falha ao processar requisicao lambda");
    throw error;
  }
};

export const processarResultadosRanqueados = async () => {
  await runtimeReady;
  const repos = criarRepositorios();
  const resultado = await Ranqueada.criar(repos.ranqueada, repos.deck, repos.usuario, repos.inscricao, repos.partida).processarConfirmacoesExpiradas();
  await NotificacaoAbly.aguardarPublicacoesPendentes();
  logger.info(resultado, "resultados ranqueados expirados processados");
  return resultado;
};
