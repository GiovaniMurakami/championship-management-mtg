import { Time } from "../entidade/time";

export interface FiltrosListarTimes {
    limite?: number;
    offset?: number;
    nome?: string;
    membroId?: string;
}

export interface TimeGateway {
    salvar(time: Time): Promise<void>;
    buscarPorId(id: string): Promise<Time | null>;
    buscarVarios(ids: string[]): Promise<Time[]>;
    buscarPorMembros(usuarioIds: string[]): Promise<Time[]>;
    buscarPorConviteToken(token: string): Promise<Time | null>;
    listar(filtros?: FiltrosListarTimes): Promise<Time[]>;
    listarTotal(filtros?: Pick<FiltrosListarTimes, 'nome' | 'membroId'>): Promise<number>;
    atualizar(time: Time): Promise<void>;
    excluir(id: string): Promise<void>;
}
