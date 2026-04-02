/* eslint-disable @typescript-eslint/no-explicit-any */
import serverless from "serverless-http";
import { app } from "./app";
import { NotificacaoAbly } from "./infra/ably/notificacaoAbly";
import { preloadJwtKeys } from "./helpers/jwt";

const aplicacao = app();
const serverlessApp = serverless(aplicacao);

const jwtKeysReady = preloadJwtKeys();

export const handler = async (event: any, context: any) => {
  await jwtKeysReady;
  const resultado = await serverlessApp(event, context);
  await NotificacaoAbly.aguardarPublicacoesPendentes();
  return resultado;
};
