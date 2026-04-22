import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";


export type SolicitarEntradaTimeInputDto = {
    timeId: string;
    usuarioId: string;
};

export type SolicitarEntradaTimeOutputDto = {
    timeId: string;
    mensagem: string;
};

export class SolicitarEntradaTime implements CasoDeUso<SolicitarEntradaTimeInputDto, SolicitarEntradaTimeOutputDto> {
    private constructor(private readonly timeGateway: TimeGateway) { }

    public static criar(timeGateway: TimeGateway) {
        return new SolicitarEntradaTime(timeGateway);
    }

    public async executar(input: SolicitarEntradaTimeInputDto): Promise<SolicitarEntradaTimeOutputDto> {
        const time = await this.timeGateway.buscarPorId(input.timeId);
        if (!time) {
            throw ErroPersonalizado.criar({ mensagem: "Time não encontrado.", status: StatusErro.erroNaoEncontrado });
        }

        if (time.membroIds.includes(input.usuarioId)) {
            throw ErroPersonalizado.criar({ mensagem: "Você já é membro deste time.", status: StatusErro.erroParametro });
        }

        const timesDoUsuario = await this.timeGateway.buscarPorMembros([input.usuarioId]);
        if (timesDoUsuario.length > 0) {
            throw ErroPersonalizado.criar({ mensagem: "Você já faz parte de um time. Saia dele antes de solicitar entrada em outro.", status: StatusErro.erroParametro });
        }

        if (time.solicitacoesPendentes.includes(input.usuarioId)) {
            throw ErroPersonalizado.criar({ mensagem: "Você já possui uma solicitação pendente.", status: StatusErro.erroParametro });
        }

        time.solicitacoesPendentes.push(input.usuarioId);
        await this.timeGateway.atualizar(time);

        return { timeId: time.id, mensagem: "Solicitação enviada. Aguarde a aprovação do dono." };
    }
}
