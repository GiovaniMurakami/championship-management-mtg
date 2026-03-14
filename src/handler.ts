/* eslint-disable @typescript-eslint/no-explicit-any */
import serverless from "serverless-http";
import { app } from "./app";

const aplicacao = app();
const serverlessApp = serverless(aplicacao);

export const handler = async (event: any, context: any) => {
  return serverlessApp(event, context);
};
