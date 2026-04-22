import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type RejeitarSolicitacaoTimeInputDto = {
    timeId: string;
    requisitanteId: string;
    usuarioId: string;
};

export type RejeitarSolicitacaoTimeOutputDto = {
    timeId: string;
    mensagem: string;
};

export class RejeitarSolicitacaoTime implements CasoDeUso<RejeitarSolicitacaoTimeInputDto, RejeitarSolicitacaoTimeOutputDto> {
    private constructor(private readonly timeGateway: TimeGateway) { }

    public static criar(timeGateway: TimeGateway) {
        return new RejeitarSolicitacaoTime(timeGateway);
    }

    public async executar(input: RejeitarSolicitacaoTimeInputDto): Promise<RejeitarSolicitacaoTimeOutputDto> {
        const time = await this.timeGateway.buscarPorId(input.timeId);
        if (!time) {
            throw ErroPersonalizado.criar({ mensagem: "Time não encontrado.", status: StatusErro.erroNaoEncontrado });
        }

        if (time.donoId !== input.requisitanteId) {
            throw ErroPersonalizado.criar({ mensagem: "Apenas o dono pode rejeitar solicitações.", status: StatusErro.erroProibido });
        }

        if (!time.solicitacoesPendentes.includes(input.usuarioId)) {
            throw ErroPersonalizado.criar({ mensagem: "Solicitação não encontrada.", status: StatusErro.erroNaoEncontrado });
        }

        time.solicitacoesPendentes = time.solicitacoesPendentes.filter((id) => id !== input.usuarioId);
        await this.timeGateway.atualizar(time);

        return { timeId: time.id, mensagem: "Solicitação rejeitada." };
    }
}
