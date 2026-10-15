import { GaleriaGateway } from "../../dominio/gateway/galeriaGateway";
import { CasoDeUso } from "../casoDeUso";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

export type ListarFotosGaleriaOutputDto = {
  fotos: Array<{
    id: string;
    url: string;
    titulo: string;
    criadoPorId: string;
    criadoEm: string;
  }>;
};

export class ListarFotosGaleria
  implements CasoDeUso<void, ListarFotosGaleriaOutputDto> {
  private constructor(private readonly galeriaGateway: GaleriaGateway) {}

  public static criar(galeriaGateway: GaleriaGateway) {
    return new ListarFotosGaleria(galeriaGateway);
  }

  public async executar(): Promise<ListarFotosGaleriaOutputDto> {
    const fotos = await this.galeriaGateway.listar();
    return {
      fotos: fotos.map((f) => ({
        id: f.id,
        url: f.url,
        titulo: f.titulo,
        criadoPorId: f.criadoPorId,
        criadoEm: toBrasiliaISO(f.criadoEm)!,
      })),
    };
  }
}
