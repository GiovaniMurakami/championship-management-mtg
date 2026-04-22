import { Time } from "../entidade/time";

export interface TimeGateway {
    salvar(time: Time): Promise<void>;
    buscarPorId(id: string): Promise<Time | null>;
    buscarVarios(ids: string[]): Promise<Time[]>;
    listar(): Promise<Time[]>;
    atualizar(time: Time): Promise<void>;
    excluir(id: string): Promise<void>;
}
