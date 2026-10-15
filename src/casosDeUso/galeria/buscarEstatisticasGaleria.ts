import { GaleriaGateway } from "../../dominio/gateway/galeriaGateway";
import { CasoDeUso } from "../casoDeUso";

export type BuscarEstatisticasGaleriaOutputDto = {
  visualizacoes: number;
};

export class BuscarEstatisticasGaleria
  implements CasoDeUso<void, BuscarEstatisticasGaleriaOutputDto> {
  private constructor(private readonly galeriaGateway: GaleriaGateway) {}

  public static criar(galeriaGateway: GaleriaGateway) {
    return new BuscarEstatisticasGaleria(galeriaGateway);
  }

  public async executar(): Promise<BuscarEstatisticasGaleriaOutputDto> {
    return this.galeriaGateway.buscarEstatisticas();
  }
}
