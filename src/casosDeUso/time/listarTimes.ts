import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";
import { normalizarPaginacaoOffset } from "../../helpers/paginacao";

const LIMITE_MAXIMO_TIMES = 100;
const LIMITE_PADRAO_TIMES = 20;

export type ListarTimesInputDto = {
    limite?: number;
    offset?: number;
    nome?: string;
};

export type ListarTimesOutputDto = {
    times: Array<{
        id: string;
        nome: string;
        descricao?: string;
        imagemUrl?: string;
        donoId: string;
        membroIds: string[];
        criadoEm: Date;
    }>;
    total: number;
    limite: number;
    offset: number;
};

export class ListarTimes implements CasoDeUso<ListarTimesInputDto, ListarTimesOutputDto> {
    private constructor(private readonly timeGateway: TimeGateway) { }

    public static criar(timeGateway: TimeGateway) {
        return new ListarTimes(timeGateway);
    }

    public async executar(input: ListarTimesInputDto): Promise<ListarTimesOutputDto> {
        const { limite, offset } = normalizarPaginacaoOffset(
            input.limite,
            input.offset,
            LIMITE_PADRAO_TIMES,
            LIMITE_MAXIMO_TIMES
        );
        const { nome } = input;

        const [times, total] = await Promise.all([
            this.timeGateway.listar({ limite, offset, nome }),
            this.timeGateway.listarTotal({ nome }),
        ]);

        return {
            times: times.map((t) => ({
                id: t.id,
                nome: t.nome,
                descricao: t.descricao,
                imagemUrl: t.imagemUrl,
                donoId: t.donoId,
                membroIds: t.membroIds,
                criadoEm: t.criadoEm,
            })),
            total,
            limite,
            offset,
        };
    }
}
