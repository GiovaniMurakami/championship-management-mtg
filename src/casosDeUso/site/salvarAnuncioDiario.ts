import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { AnuncioDiarioItem, SiteConfigGateway } from "../../dominio/gateway/siteConfigGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";

type AnuncioInput = Partial<AnuncioDiarioItem>;

const MAX_ANUNCIOS = 20;
const isUuid = (value: string): boolean => z.string().uuid().safeParse(value).success;

export class SalvarAnuncioDiario {
  private constructor(private readonly siteConfigGateway: SiteConfigGateway) {}

  public static criar(siteConfigGateway: SiteConfigGateway) {
    return new SalvarAnuncioDiario(siteConfigGateway);
  }

  public async executar(input: { anuncios?: AnuncioInput[] }) {
    if (!Array.isArray(input.anuncios)) {
      throw ErroPersonalizado.criar({
        mensagem: "Lista de anúncios diários inválida.",
        status: 400,
      });
    }

    if (input.anuncios.length > MAX_ANUNCIOS) {
      throw ErroPersonalizado.criar({
        mensagem: `Informe no máximo ${MAX_ANUNCIOS} anúncios diários.`,
        status: 400,
      });
    }

    const existente = await this.siteConfigGateway.buscarAnuncioDiario();
    const metricasPorId = new Map(
      (existente?.anuncios ?? []).map((a) => [a.id, { visualizacoes: a.visualizacoes, cliques: a.cliques }])
    );

    const anuncios = input.anuncios.map((item, index): AnuncioDiarioItem => {
      const imagemUrl = String(item.imagemUrl ?? "").trim();
      const link = String(item.link ?? "").trim();
      const ativo = item.ativo !== false;
      const rawId = typeof item.id === "string" ? item.id.trim() : "";
      const id = rawId && isUuid(rawId) ? rawId : uuidv4();

      if (ativo && !imagemUrl) {
        throw ErroPersonalizado.criar({
          mensagem: "Informe a imagem do anúncio diário para ativá-lo.",
          status: 400,
        });
      }

      const metricas = metricasPorId.get(id) ?? { visualizacoes: 0, cliques: 0 };

      return {
        id,
        imagemUrl,
        link,
        ativo,
        ordem: Number.isFinite(item.ordem) ? Number(item.ordem) : index,
        visualizacoes: metricas.visualizacoes,
        cliques: metricas.cliques,
      };
    });

    const salvo = await this.siteConfigGateway.salvarAnuncioDiario({
      anuncios,
      atualizadoEm: new Date(),
    });

    return {
      anuncios: salvo.anuncios.map((a) => ({
        id: a.id,
        imagemUrl: a.imagemUrl,
        link: a.link,
        ativo: a.ativo,
        ordem: a.ordem,
        visualizacoes: a.visualizacoes,
        cliques: a.cliques,
      })),
      atualizadoEm: salvo.atualizadoEm ? salvo.atualizadoEm.toISOString() : null,
    };
  }
}
