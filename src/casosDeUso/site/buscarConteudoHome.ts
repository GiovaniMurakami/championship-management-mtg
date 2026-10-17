import { CacheGateway } from "../../dominio/gateway/cacheGateway";
import { ConteudoHomeConfig, SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { CACHE_PK_SITE } from "../../helpers/cache/chavesCache";
import { getCacheTtlSegundos } from "../../helpers/cache/ttlCache";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

const CACHE_SK = "home-conteudo";

export const CONTEUDO_HOME_PADRAO: Omit<ConteudoHomeConfig, "atualizadoEm"> = {
  youtube: {
    titulo: "Vídeos de Pauper todos os dias!",
    texto: "Conteúdo de MTG Pauper exclusivo todos os dias no nosso canal no Youtube",
  },
  twitch: {
    titulo: "Transmissões e campeonatos ao vivo pela Twitch e Youtube!",
    texto: "Acompanhe as transmissões ao vivo com torneios, análises e muito conteúdo sobre Pauper no MTGO.",
  },
  artigos: {
    titulo: "Veja as novidades",
    texto: "Conteúdos educativos, deck techs e dicas de gameplay — além dos torneios.",
  },
  parceiros: {
    titulo: "Parceiros do Canal",
    texto: "Saiba mais sobre nossos parceiros",
  },
};

export class BuscarConteudoHome {
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheGateway,
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheGateway) {
    return new BuscarConteudoHome(siteConfigGateway, cache);
  }

  public async executar() {
    const versaoCache = await this.cache?.obterVersao(CACHE_PK_SITE);
    const cacheado = await this.cache?.buscar<unknown>(CACHE_PK_SITE, CACHE_SK, versaoCache);
    if (cacheado) return cacheado;

    const config = await this.siteConfigGateway.buscarConteudoHome();
    const saida = this.normalizar(config);
    await this.cache?.salvar(
      CACHE_PK_SITE,
      CACHE_SK,
      saida,
      getCacheTtlSegundos("DYNAMODB_CACHE_TTL_SITE_SECONDS", 300),
      versaoCache,
    );
    return saida;
  }

  private normalizar(config: ConteudoHomeConfig | null) {
    return {
      youtube: {
        titulo: config?.youtube?.titulo || CONTEUDO_HOME_PADRAO.youtube.titulo,
        texto: config?.youtube?.texto || CONTEUDO_HOME_PADRAO.youtube.texto,
      },
      twitch: {
        titulo: config?.twitch?.titulo || CONTEUDO_HOME_PADRAO.twitch.titulo,
        texto: config?.twitch?.texto || CONTEUDO_HOME_PADRAO.twitch.texto,
      },
      artigos: {
        titulo: config?.artigos?.titulo || CONTEUDO_HOME_PADRAO.artigos.titulo,
        texto: config?.artigos?.texto || CONTEUDO_HOME_PADRAO.artigos.texto,
      },
      parceiros: {
        titulo: config?.parceiros?.titulo || CONTEUDO_HOME_PADRAO.parceiros.titulo,
        texto: config?.parceiros?.texto || CONTEUDO_HOME_PADRAO.parceiros.texto,
      },
      fugueteUsuarioId: config?.fugueteUsuarioId || null,
      atualizadoEm: config?.atualizadoEm ? toBrasiliaISO(config.atualizadoEm) : null,
    };
  }
}
