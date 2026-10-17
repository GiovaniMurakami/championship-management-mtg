import { CacheGateway } from "../../dominio/gateway/cacheGateway";
import { SiteConfigGateway, SobreMimConfig } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { CACHE_PK_SITE } from "../../helpers/cache/chavesCache";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { SOBRE_MIM_PADRAO } from "./buscarSobreMim";

const limpar = (valor: unknown, limite: number) => {
  if (typeof valor !== "string") return "";
  return valor.trim().slice(0, limite);
};

export class SalvarSobreMim {
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheGateway,
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheGateway) {
    return new SalvarSobreMim(siteConfigGateway, cache);
  }

  public async executar(input: Partial<SobreMimConfig>) {
    if (!input || typeof input !== "object") {
      throw ErroPersonalizado.criar({ mensagem: "Conteúdo inválido.", status: 400 });
    }

    const galeriaUrls = Array.isArray(input.galeriaUrls)
      ? input.galeriaUrls.map((u) => limpar(u, 800)).filter(Boolean).slice(0, 20)
      : [];

    const config: SobreMimConfig = {
      tituloHistoria: limpar(input.tituloHistoria, 160) || SOBRE_MIM_PADRAO.tituloHistoria,
      historia: limpar(input.historia, 8000) || SOBRE_MIM_PADRAO.historia,
      fotoUrl: limpar(input.fotoUrl, 800) || SOBRE_MIM_PADRAO.fotoUrl,
      apoiaTitulo: limpar(input.apoiaTitulo, 160) || SOBRE_MIM_PADRAO.apoiaTitulo,
      apoiaTexto: limpar(input.apoiaTexto, 800) || SOBRE_MIM_PADRAO.apoiaTexto,
      apoiaImagemUrl: limpar(input.apoiaImagemUrl, 800) || SOBRE_MIM_PADRAO.apoiaImagemUrl,
      apoiaUrl: limpar(input.apoiaUrl, 800) || SOBRE_MIM_PADRAO.apoiaUrl,
      galeriaTitulo: limpar(input.galeriaTitulo, 160) || SOBRE_MIM_PADRAO.galeriaTitulo,
      galeriaUrls: galeriaUrls.length > 0 ? galeriaUrls : SOBRE_MIM_PADRAO.galeriaUrls,
      agradecimentoTitulo: limpar(input.agradecimentoTitulo, 160) || SOBRE_MIM_PADRAO.agradecimentoTitulo,
      agradecimentoTexto: limpar(input.agradecimentoTexto, 400) || SOBRE_MIM_PADRAO.agradecimentoTexto,
      apoiadores: limpar(input.apoiadores, 12000) || SOBRE_MIM_PADRAO.apoiadores,
      atualizadoEm: new Date(),
    };

    const salvo = await this.siteConfigGateway.salvarSobreMim(config);
    await this.cache?.invalidarParticao(CACHE_PK_SITE);

    return {
      ...salvo,
      atualizadoEm: salvo.atualizadoEm ? toBrasiliaISO(salvo.atualizadoEm) : null,
    };
  }
}
