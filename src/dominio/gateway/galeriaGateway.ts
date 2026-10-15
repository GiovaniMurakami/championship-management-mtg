import { FotoGaleria } from "../entidade/fotoGaleria";

export type EstatisticasGaleria = {
  visualizacoes: number;
};

export interface GaleriaGateway {
  salvar(foto: FotoGaleria): Promise<void>;
  listar(): Promise<FotoGaleria[]>;
  buscarPorId(id: string): Promise<FotoGaleria | null>;
  excluir(id: string): Promise<boolean>;
  incrementarVisualizacoesPagina(): Promise<EstatisticasGaleria>;
  buscarEstatisticas(): Promise<EstatisticasGaleria>;
}
