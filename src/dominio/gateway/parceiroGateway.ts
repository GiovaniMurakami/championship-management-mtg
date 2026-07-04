import { Parceiro } from "../entidade/parceiro";

export interface ParceiroGateway {
  salvar(parceiro: Parceiro): Promise<void>;
  buscarPorId(id: string): Promise<Parceiro | null>;
  listar(apenasAtivos?: boolean): Promise<Parceiro[]>;
  atualizar(parceiro: Parceiro): Promise<void>;
  excluir(id: string): Promise<void>;
}
