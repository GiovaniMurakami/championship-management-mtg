import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";

export type ListarTimesInputDto = {
    limite?: number;
    offset?: number;
};

export type ListarTimesOutputDto = {
    times: Array<{
        id: string;
        nome: string;
        descricao?: string;
        donoId: string;
        membroIds: string[];
        criadoEm: Date;
    }>;
};

export class ListarTimes implements CasoDeUso<ListarTimesInputDto, ListarTimesOutputDto> {
    private constructor(private readonly timeGateway: TimeGateway) { }

    public static criar(timeGateway: TimeGateway) {
        return new ListarTimes(timeGateway);
    }

    public async executar(input: ListarTimesInputDto): Promise<ListarTimesOutputDto> {
        let times = await this.timeGateway.listar();
        if (input.offset !== undefined) times = times.slice(input.offset);
        if (input.limite !== undefined) times = times.slice(0, input.limite);
        return {
            times: times.map((t) => ({
                id: t.id,
                nome: t.nome,
                descricao: t.descricao,
                donoId: t.donoId,
                membroIds: t.membroIds,
                criadoEm: t.criadoEm,
            })),
        };
    }
}
