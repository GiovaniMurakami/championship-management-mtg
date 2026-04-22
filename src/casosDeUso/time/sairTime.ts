import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type SairTimeInputDto = {
    timeId: string;
    usuarioId: string;
};

export type SairTimeOutputDto = {
    timeId: string;
    membroIds: string[];
};

export class SairTime implements CasoDeUso<SairTimeInputDto, SairTimeOutputDto> {
    private constructor(private readonly timeGateway: TimeGateway) { }

    public static criar(timeGateway: TimeGateway) {
        return new SairTime(timeGateway);
    }

    public async executar(input: SairTimeInputDto): Promise<SairTimeOutputDto> {
        const time = await this.timeGateway.buscarPorId(input.timeId);
        if (!time) {
            throw ErroPersonalizado.criar({
                mensagem: "Time não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (!time.membroIds.includes(input.usuarioId)) {
            throw ErroPersonalizado.criar({
                mensagem: "Você não é membro deste time.",
                status: StatusErro.erroParametro,
            });
        }

        if (time.donoId === input.usuarioId) {
            throw ErroPersonalizado.criar({
                mensagem: "O dono do time não pode sair. Transfira a liderança ou exclua o time.",
                status: StatusErro.erroParametro,
            });
        }

        time.membroIds = time.membroIds.filter((id) => id !== input.usuarioId);
        await this.timeGateway.atualizar(time);

        return { timeId: time.id, membroIds: time.membroIds };
    }
}
