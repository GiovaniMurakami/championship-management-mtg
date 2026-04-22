import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type EntrarTimeInputDto = {
    timeId: string;
    usuarioId: string;
};

export type EntrarTimeOutputDto = {
    timeId: string;
    usuario: { id: string; nome: string };
    membroIds: string[];
};

export class EntrarTime implements CasoDeUso<EntrarTimeInputDto, EntrarTimeOutputDto> {
    private constructor(
        private readonly timeGateway: TimeGateway,
        private readonly usuarioGateway: UsuarioGateway
    ) { }

    public static criar(timeGateway: TimeGateway, usuarioGateway: UsuarioGateway) {
        return new EntrarTime(timeGateway, usuarioGateway);
    }

    public async executar(input: EntrarTimeInputDto): Promise<EntrarTimeOutputDto> {
        const time = await this.timeGateway.buscarPorId(input.timeId);
        if (!time) {
            throw ErroPersonalizado.criar({
                mensagem: "Time não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (time.membroIds.includes(input.usuarioId)) {
            throw ErroPersonalizado.criar({
                mensagem: "Você já é membro deste time.",
                status: StatusErro.erroParametro,
            });
        }

        const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);
        if (!usuario) {
            throw ErroPersonalizado.criar({
                mensagem: "Usuário não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        time.membroIds.push(input.usuarioId);
        await this.timeGateway.atualizar(time);

        return {
            timeId: time.id,
            usuario: { id: usuario.id, nome: usuario.nome },
            membroIds: time.membroIds,
        };
    }
}
