import { GaleriaGateway } from "../../dominio/gateway/galeriaGateway";
import { CasoDeUso } from "../casoDeUso";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

export const GALERIA_LIMITE_PADRAO = 50;

export type ListarFotosGaleriaInputDto = {
  limite?: number;
  offset?: number;
};

export type ListarFotosGaleriaOutputDto = {
  fotos: Array<{
    id: string;
    url: string;
    titulo: string;
    criadoPorId: string;
    criadoEm: string;
  }>;
  total: number;
  limite: number;
  offset: number;
};

export class ListarFotosGaleria
  implements CasoDeUso<ListarFotosGaleriaInputDto, ListarFotosGaleriaOutputDto> {
  private constructor(private readonly galeriaGateway: GaleriaGateway) {}

  public static criar(galeriaGateway: GaleriaGateway) {
    return new ListarFotosGaleria(galeriaGateway);
  }

  public async executar(
    input: ListarFotosGaleriaInputDto = {}
  ): Promise<ListarFotosGaleriaOutputDto> {
    const limite = Math.min(100, Math.max(1, Number(input.limite) || GALERIA_LIMITE_PADRAO));
    const offset = Math.max(0, Number(input.offset) || 0);

    const todas = await this.galeriaGateway.listar();
    const pagina = todas.slice(offset, offset + limite);

    return {
      fotos: pagina.map((f) => ({
        id: f.id,
        url: f.url,
        titulo: f.titulo,
        criadoPorId: f.criadoPorId,
        criadoEm: toBrasiliaISO(f.criadoEm)!,
      })),
      total: todas.length,
      limite,
      offset,
    };
  }
}
