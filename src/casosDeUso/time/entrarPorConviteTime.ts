import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type EntrarPorConviteTimeInputDto = {
    conviteToken: string;
    usuarioId: string;
};

export type EntrarPorConviteTimeOutputDto = {
    timeId: string;
    timeNome: string;
    usuario: { id: string; nome: string };
    membroIds: string[];
};

export class EntrarPorConviteTime implements CasoDeUso<EntrarPorConviteTimeInputDto, EntrarPorConviteTimeOutputDto> {
    private constructor(
        private readonly timeGateway: TimeGateway,
        private readonly usuarioGateway: UsuarioGateway
    ) { }

    public static criar(timeGateway: TimeGateway, usuarioGateway: UsuarioGateway) {
        return new EntrarPorConviteTime(timeGateway, usuarioGateway);
    }

    public async executar(input: EntrarPorConviteTimeInputDto): Promise<EntrarPorConviteTimeOutputDto> {
        const time = await this.timeGateway.buscarPorConviteToken(input.conviteToken);
        if (!time) {
            throw ErroPersonalizado.criar({ mensagem: "Convite inválido ou expirado.", status: StatusErro.erroNaoEncontrado });
        }

        if (time.membroIds.includes(input.usuarioId)) {
            throw ErroPersonalizado.criar({ mensagem: "Você já é membro deste time.", status: StatusErro.erroParametro });
        }

        const timesDoUsuario = await this.timeGateway.buscarPorMembros([input.usuarioId]);
        if (timesDoUsuario.length > 0) {
            throw ErroPersonalizado.criar({ mensagem: "Você já faz parte de um time. Saia dele antes de entrar em outro.", status: StatusErro.erroParametro });
        }

        const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);
        if (!usuario) {
            throw ErroPersonalizado.criar({ mensagem: "Usuário não encontrado.", status: StatusErro.erroNaoEncontrado });
        }

        time.membroIds.push(input.usuarioId);
        time.conviteToken = undefined;
        await this.timeGateway.atualizar(time);

        return {
            timeId: time.id,
            timeNome: time.nome,
            usuario: { id: usuario.id, nome: usuario.nome },
            membroIds: time.membroIds,
        };
    }
}
