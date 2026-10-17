import { z } from "zod";
import { CacheGateway } from "../../dominio/gateway/cacheGateway";
import { ConteudoHomeConfig, SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { CACHE_PK_SITE } from "../../helpers/cache/chavesCache";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { CONTEUDO_HOME_PADRAO } from "./buscarConteudoHome";

const limpar = (valor: unknown, limite: number) => {
  if (typeof valor !== "string") return "";
  return valor.trim().slice(0, limite);
};

const secao = (input: { titulo?: string; texto?: string } | undefined, fallback: { titulo: string; texto: string }) => ({
  titulo: limpar(input?.titulo, 160) || fallback.titulo,
  texto: limpar(input?.texto, 500) || fallback.texto,
});

export class SalvarConteudoHome {
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheGateway,
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheGateway) {
    return new SalvarConteudoHome(siteConfigGateway, cache);
  }

  public async executar(input: Partial<ConteudoHomeConfig>) {
    if (!input || typeof input !== "object") {
      throw ErroPersonalizado.criar({ mensagem: "Conteúdo da home inválido.", status: 400 });
    }

    const fugueteUsuarioId = limpar(input.fugueteUsuarioId, 80);
    if (fugueteUsuarioId && !z.string().uuid().safeParse(fugueteUsuarioId).success) {
      throw ErroPersonalizado.criar({
        mensagem: "fugueteUsuarioId deve ser um UUID válido.",
        status: 400,
      });
    }

    const config: ConteudoHomeConfig = {
      youtube: secao(input.youtube, CONTEUDO_HOME_PADRAO.youtube),
      twitch: secao(input.twitch, CONTEUDO_HOME_PADRAO.twitch),
      artigos: secao(input.artigos, CONTEUDO_HOME_PADRAO.artigos),
      parceiros: secao(input.parceiros, CONTEUDO_HOME_PADRAO.parceiros),
      fugueteUsuarioId: fugueteUsuarioId || undefined,
      atualizadoEm: new Date(),
    };

    const salvo = await this.siteConfigGateway.salvarConteudoHome(config);
    await this.cache?.invalidarParticao(CACHE_PK_SITE);

    return {
      youtube: salvo.youtube,
      twitch: salvo.twitch,
      artigos: salvo.artigos,
      parceiros: salvo.parceiros,
      fugueteUsuarioId: salvo.fugueteUsuarioId || null,
      atualizadoEm: salvo.atualizadoEm ? toBrasiliaISO(salvo.atualizadoEm) : null,
    };
  }
}
