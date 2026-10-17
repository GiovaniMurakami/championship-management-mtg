import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { CacheGateway } from "../../dominio/gateway/cacheGateway";
import { ParceiroSite, SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { CACHE_PK_SITE } from "../../helpers/cache/chavesCache";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

const MAX_PARCEIROS = 60;
const isUuid = (value: string) => z.string().uuid().safeParse(value).success;

const limpar = (valor: unknown, limite: number) => {
  if (typeof valor !== "string") return undefined;
  const texto = valor.trim();
  return texto ? texto.slice(0, limite) : undefined;
};

export class SalvarParceiros {
  private constructor(
    private readonly siteConfigGateway: SiteConfigGateway,
    private readonly cache?: CacheGateway,
  ) {}

  public static criar(siteConfigGateway: SiteConfigGateway, cache?: CacheGateway) {
    return new SalvarParceiros(siteConfigGateway, cache);
  }

  public async executar(input: {
    parceiros?: Partial<ParceiroSite>[];
    cupomGlobal?: string;
    paginaTitulo?: string;
    paginaTexto?: string;
    ctaTitulo?: string;
    ctaTexto?: string;
    contatoEmail?: string;
  }) {
    if (!Array.isArray(input.parceiros)) {
      throw ErroPersonalizado.criar({ mensagem: "Lista de parceiros inválida.", status: 400 });
    }
    if (input.parceiros.length > MAX_PARCEIROS) {
      throw ErroPersonalizado.criar({
        mensagem: `Informe no máximo ${MAX_PARCEIROS} parceiros.`,
        status: 400,
      });
    }

    const parceiros = input.parceiros.map((item, index): ParceiroSite => {
      const id = isUuid(String(item.id || "")) ? String(item.id) : uuidv4();
      const nome = limpar(item.nome, 120) || "";
      if (!nome) {
        throw ErroPersonalizado.criar({
          mensagem: `Parceiro na posição ${index + 1} precisa de nome.`,
          status: 400,
        });
      }
      return {
        id,
        nome,
        logoUrl: limpar(item.logoUrl, 800) || "",
        linkUrl: limpar(item.linkUrl, 800) || "",
        cupom: limpar(item.cupom, 40),
        ordem: Number.isFinite(item.ordem) ? Number(item.ordem) : index,
        ativo: item.ativo !== false,
      };
    });

    const salvo = await this.siteConfigGateway.salvarParceiros({
      parceiros,
      cupomGlobal: limpar(input.cupomGlobal, 40),
      paginaTitulo: limpar(input.paginaTitulo, 200),
      paginaTexto: limpar(input.paginaTexto, 800),
      ctaTitulo: limpar(input.ctaTitulo, 160),
      ctaTexto: limpar(input.ctaTexto, 400),
      contatoEmail: limpar(input.contatoEmail, 120),
      atualizadoEm: new Date(),
    });
    await this.cache?.invalidarParticao(CACHE_PK_SITE);

    return {
      parceiros: salvo.parceiros,
      cupomGlobal: salvo.cupomGlobal || null,
      paginaTitulo: salvo.paginaTitulo || null,
      paginaTexto: salvo.paginaTexto || null,
      ctaTitulo: salvo.ctaTitulo || null,
      ctaTexto: salvo.ctaTexto || null,
      contatoEmail: salvo.contatoEmail || null,
      atualizadoEm: salvo.atualizadoEm ? toBrasiliaISO(salvo.atualizadoEm) : null,
    };
  }
}
