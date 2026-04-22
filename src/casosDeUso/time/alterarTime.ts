import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type AlterarTimeInputDto = {
    id: string;
    requisitanteId: string;
    isAdmin: boolean;
    nome?: string;
    descricao?: string;
    imagemUrl?: string;
};

export type AlterarTimeOutputDto = {
    id: string;
    nome: string;
    descricao?: string;
    imagemUrl?: string;
    donoId: string;
    membroIds: string[];
    criadoEm: Date;
};

export class AlterarTime implements CasoDeUso<AlterarTimeInputDto, AlterarTimeOutputDto> {
    private constructor(private readonly timeGateway: TimeGateway) { }

    public static criar(timeGateway: TimeGateway) {
        return new AlterarTime(timeGateway);
    }

    public async executar(input: AlterarTimeInputDto): Promise<AlterarTimeOutputDto> {
        const time = await this.timeGateway.buscarPorId(input.id);
        if (!time) {
            throw ErroPersonalizado.criar({
                mensagem: "Time não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (time.donoId !== input.requisitanteId && !input.isAdmin) {
            throw ErroPersonalizado.criar({
                mensagem: "Sem permissão para alterar este time.",
                status: StatusErro.erroProibido,
            });
        }

        if (input.nome !== undefined) time.nome = input.nome.trim();
        if (input.descricao !== undefined) time.descricao = input.descricao?.trim();
        if (input.imagemUrl !== undefined) time.imagemUrl = input.imagemUrl;

        await this.timeGateway.atualizar(time);

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
