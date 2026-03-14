/* eslint-disable @typescript-eslint/no-explicit-any */
import serverless from "serverless-http";
import { app } from "./app";
import { NotificacaoAbly } from "./infra/ably/notificacaoAbly";

const aplicacao = app();
const serverlessApp = serverless(aplicacao);

export const handler = async (event: any, context: any) => {
  const resultado = await serverlessApp(event, context);
  await NotificacaoAbly.aguardarPublicacoesPendentes();
  return resultado;
};
