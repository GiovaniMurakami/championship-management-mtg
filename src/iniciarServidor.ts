import { app, inicializarDependenciasDeProcesso } from "./app";
import { preloadJwtKeys } from "./helpers/jwt";
import { logger } from "./helpers/logger";

export async function iniciarServidor() {
  try {
    await preloadJwtKeys();
    inicializarDependenciasDeProcesso();
    const aplicacao = app();
    const port = Number(process.env.PORT) || 3000;
    aplicacao.listen(port, () => {
      logger.info({ port }, "Servidor local iniciado");
    });
  } catch (error) {
    logger.error({ err: error }, "Falha ao iniciar servidor");
    process.exit(1);
  }
}

iniciarServidor();
