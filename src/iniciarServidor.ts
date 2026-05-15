import { app, inicializarDependenciasDeProcesso } from "./app";

export async function iniciarServidor() {
  inicializarDependenciasDeProcesso();
  const aplicacao = app();
  const port = Number(process.env.PORT) || 3000;
  aplicacao.listen(port);
}

iniciarServidor();
