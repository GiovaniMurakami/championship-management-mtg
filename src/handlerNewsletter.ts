import { criarRepositorios } from "./composicao/repositorios";
import { criarServicos } from "./composicao/servicos";
import { ListarMetagame } from "./casosDeUso/metagame/listarMetagame";
import { EnviarNewsletterMetagameSemanal } from "./casosDeUso/site/enviarNewsletterMetagameSemanal";
import { logger } from "./helpers/logger";

export const handler = async () => {
  const repos = criarRepositorios();
  const servicos = criarServicos();
  const listarMetagame = ListarMetagame.criar(
    repos.torneio,
    repos.inscricao,
    repos.partida,
    repos.deck,
    repos.usuario,
    servicos.cache,
    repos.siteConfig,
  );
  const caso = EnviarNewsletterMetagameSemanal.criar(repos.usuario, listarMetagame, servicos.email);

  try {
    const resultado = await caso.executar();
    logger.info(resultado, "newsletterSemanal concluída");
    return { statusCode: 200, body: JSON.stringify(resultado) };
  } catch (error) {
    logger.error({ err: error }, "newsletterSemanal falhou");
    throw error;
  }
};
