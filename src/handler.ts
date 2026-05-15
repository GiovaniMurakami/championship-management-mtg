/* eslint-disable @typescript-eslint/no-explicit-any */
import serverless from "serverless-http";
import { app, inicializarDependenciasDeProcesso } from "./app";
import { NotificacaoAbly } from "./infra/ably/notificacaoAbly";
import { preloadJwtKeys } from "./helpers/jwt";

const aplicacao = app();
const serverlessApp = serverless(aplicacao);

const runtimeReady = Promise.all([
  preloadJwtKeys(),
  Promise.resolve().then(() => inicializarDependenciasDeProcesso()),
]);

export const handler = async (event: any, context: any) => {
  await runtimeReady;
  const resultado = await serverlessApp(event, context);
  await NotificacaoAbly.aguardarPublicacoesPendentes();
  return resultado;
};
