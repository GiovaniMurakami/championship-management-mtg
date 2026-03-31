import { Time } from "../entidade/time";

export interface TimeGateway {
  salvar(time: Time): Promise<void>;
  buscarPorId(id: string): Promise<Time | null>;
  listar(): Promise<Time[]>;
  atualizar(time: Time): Promise<void>;
  excluir(id: string): Promise<void>;
  buscarPorMembro(usuarioId: string): Promise<Time[]>;
}
