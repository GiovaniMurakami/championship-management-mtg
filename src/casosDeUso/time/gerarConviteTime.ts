import { randomUUID } from "crypto";
import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type GerarConviteTimeInputDto = {
    timeId: string;
    requisitanteId: string;
};

export type GerarConviteTimeOutputDto = {
    conviteToken: string;
};

export class GerarConviteTime implements CasoDeUso<GerarConviteTimeInputDto, GerarConviteTimeOutputDto> {
    private constructor(private readonly timeGateway: TimeGateway) { }

    public static criar(timeGateway: TimeGateway) {
        return new GerarConviteTime(timeGateway);
    }

    public async executar(input: GerarConviteTimeInputDto): Promise<GerarConviteTimeOutputDto> {
        const time = await this.timeGateway.buscarPorId(input.timeId);
        if (!time) {
            throw ErroPersonalizado.criar({ mensagem: "Time não encontrado.", status: StatusErro.erroNaoEncontrado });
        }

        if (time.donoId !== input.requisitanteId) {
            throw ErroPersonalizado.criar({ mensagem: "Apenas o dono pode gerar convites.", status: StatusErro.erroProibido });
        }

        time.conviteToken = randomUUID();
        await this.timeGateway.atualizar(time);

        return { conviteToken: time.conviteToken };
    }
}
