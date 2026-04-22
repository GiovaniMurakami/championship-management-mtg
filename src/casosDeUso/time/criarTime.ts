import { Time } from "../../dominio/entidade/time";
import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";

export type CriarTimeInputDto = {
    nome: string;
    descricao?: string;
    imagemUrl?: string;
    donoId: string;
};

export type CriarTimeOutputDto = {
    id: string;
    nome: string;
    descricao?: string;
    imagemUrl?: string;
    donoId: string;
    membroIds: string[];
    criadoEm: Date;
};

export class CriarTime implements CasoDeUso<CriarTimeInputDto, CriarTimeOutputDto> {
    private constructor(private readonly timeGateway: TimeGateway) { }

    public static criar(timeGateway: TimeGateway) {
        return new CriarTime(timeGateway);
    }

    public async executar(input: CriarTimeInputDto): Promise<CriarTimeOutputDto> {
        const time = Time.criar({
            nome: input.nome.trim(),
            descricao: input.descricao?.trim(),
            imagemUrl: input.imagemUrl,
            donoId: input.donoId,
            membroIds: [input.donoId],
        });

        await this.timeGateway.salvar(time);

        return {
            id: time.id,
            nome: time.nome,
            descricao: time.descricao,
            imagemUrl: time.imagemUrl,
            donoId: time.donoId,
            membroIds: time.membroIds,
            criadoEm: time.criadoEm,
        };
    }
}
