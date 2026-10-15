import { FotoGaleria } from "../entidade/fotoGaleria";

export interface GaleriaGateway {
  salvar(foto: FotoGaleria): Promise<void>;
  listar(): Promise<FotoGaleria[]>;
  buscarPorId(id: string): Promise<FotoGaleria | null>;
  excluir(id: string): Promise<boolean>;
}
