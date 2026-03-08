/* eslint-disable @typescript-eslint/no-explicit-any */
import serverless from "serverless-http";
import { app } from "./app";

export const handler = async (event: any, context: any) => {
  const aplicacao = app();
  const serverlessApp = serverless(aplicacao);
  return serverlessApp(event, context);
};
