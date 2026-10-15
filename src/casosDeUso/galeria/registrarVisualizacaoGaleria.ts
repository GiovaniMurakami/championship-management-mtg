import { GaleriaGateway } from "../../dominio/gateway/galeriaGateway";
import { CasoDeUso } from "../casoDeUso";

export type RegistrarVisualizacaoGaleriaOutputDto = {
  visualizacoes: number;
};

export class RegistrarVisualizacaoGaleria
  implements CasoDeUso<void, RegistrarVisualizacaoGaleriaOutputDto> {
  private constructor(private readonly galeriaGateway: GaleriaGateway) {}

  public static criar(galeriaGateway: GaleriaGateway) {
    return new RegistrarVisualizacaoGaleria(galeriaGateway);
  }

  public async executar(): Promise<RegistrarVisualizacaoGaleriaOutputDto> {
    return this.galeriaGateway.incrementarVisualizacoesPagina();
  }
}
