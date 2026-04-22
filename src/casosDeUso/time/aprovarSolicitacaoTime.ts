import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type AprovarSolicitacaoTimeInputDto = {
    timeId: string;
    requisitanteId: string;
    usuarioId: string;
};

export type AprovarSolicitacaoTimeOutputDto = {
    timeId: string;
    usuario: { id: string; nome: string };
    membroIds: string[];
};

export class AprovarSolicitacaoTime implements CasoDeUso<AprovarSolicitacaoTimeInputDto, AprovarSolicitacaoTimeOutputDto> {
    private constructor(
        private readonly timeGateway: TimeGateway,
        private readonly usuarioGateway: UsuarioGateway
    ) { }

    public static criar(timeGateway: TimeGateway, usuarioGateway: UsuarioGateway) {
        return new AprovarSolicitacaoTime(timeGateway, usuarioGateway);
    }

    public async executar(input: AprovarSolicitacaoTimeInputDto): Promise<AprovarSolicitacaoTimeOutputDto> {
        const time = await this.timeGateway.buscarPorId(input.timeId);
        if (!time) {
            throw ErroPersonalizado.criar({ mensagem: "Time não encontrado.", status: StatusErro.erroNaoEncontrado });
        }

        if (time.donoId !== input.requisitanteId) {
            throw ErroPersonalizado.criar({ mensagem: "Apenas o dono pode aprovar solicitações.", status: StatusErro.erroProibido });
        }

        if (!time.solicitacoesPendentes.includes(input.usuarioId)) {
            throw ErroPersonalizado.criar({ mensagem: "Solicitação não encontrada.", status: StatusErro.erroNaoEncontrado });
        }

        const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);
        if (!usuario) {
            throw ErroPersonalizado.criar({ mensagem: "Usuário não encontrado.", status: StatusErro.erroNaoEncontrado });
        }

        const timesDoUsuario = await this.timeGateway.buscarPorMembros([input.usuarioId]);
        if (timesDoUsuario.length > 0) {
            throw ErroPersonalizado.criar({ mensagem: "Este usuário já faz parte de outro time.", status: StatusErro.erroParametro });
        }

        time.solicitacoesPendentes = time.solicitacoesPendentes.filter((id) => id !== input.usuarioId);
        time.membroIds.push(input.usuarioId);
        await this.timeGateway.atualizar(time);

        return {
            timeId: time.id,
            usuario: { id: usuario.id, nome: usuario.nome },
            membroIds: time.membroIds,
        };
    }
}
