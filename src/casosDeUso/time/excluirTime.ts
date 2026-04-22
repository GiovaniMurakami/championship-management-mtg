import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type ExcluirTimeInputDto = {
    id: string;
    requisitanteId: string;
    isAdmin: boolean;
};

export type ExcluirTimeOutputDto = { mensagem: string };

export class ExcluirTime implements CasoDeUso<ExcluirTimeInputDto, ExcluirTimeOutputDto> {
    private constructor(private readonly timeGateway: TimeGateway) { }

    public static criar(timeGateway: TimeGateway) {
        return new ExcluirTime(timeGateway);
    }

    public async executar(input: ExcluirTimeInputDto): Promise<ExcluirTimeOutputDto> {
        const time = await this.timeGateway.buscarPorId(input.id);
        if (!time) {
            throw ErroPersonalizado.criar({
                mensagem: "Time não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (time.donoId !== input.requisitanteId && !input.isAdmin) {
            throw ErroPersonalizado.criar({
                mensagem: "Sem permissão para excluir este time.",
                status: StatusErro.erroProibido,
            });
        }

        await this.timeGateway.excluir(input.id);

        return { mensagem: "Time excluído com sucesso." };
    }
}
