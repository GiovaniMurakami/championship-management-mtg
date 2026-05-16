/* eslint-disable @typescript-eslint/no-explicit-any */
import serverless from "serverless-http";
import { app, inicializarDependenciasDeProcesso } from "./app";
import { NotificacaoAbly } from "./infra/ably/notificacaoAbly";
import { preloadJwtKeys } from "./helpers/jwt";
import { logger } from "./helpers/logger";

const aplicacao = app();
const serverlessApp = serverless(aplicacao);

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
    return resultado;
  } catch (error) {
    logger.error({ err: error, path: event?.path, method: event?.httpMethod }, "falha ao processar requisicao lambda");
    throw error;
  }
};
