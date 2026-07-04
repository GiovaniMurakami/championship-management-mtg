import { Apoiador } from "../entidade/apoiador";

export interface ApoiadorGateway {
  salvar(apoiador: Apoiador): Promise<void>;
  buscarPorId(id: string): Promise<Apoiador | null>;
  listar(apenasAtivos?: boolean): Promise<Apoiador[]>;
  atualizar(apoiador: Apoiador): Promise<void>;
  excluir(id: string): Promise<void>;
}
