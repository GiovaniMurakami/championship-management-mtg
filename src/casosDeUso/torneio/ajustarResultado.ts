import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type AjustarResultadoInputDto = {
    partidaId: string;
    requisitanteId: string;
    isAdmin: boolean;
    vitoriasJogador1: number;
    vitoriasJogador2: number;
};

export type AjustarResultadoOutputDto = {
    id: string;
    torneioId: string;
    rodada: number;
    jogador1Id: string;
    jogador2Id: string | null;
    vitoriasJogador1: number;
    vitoriasJogador2: number;
    status: string;
    contestado: boolean;
};

export class AjustarResultado
    implements CasoDeUso<AjustarResultadoInputDto, AjustarResultadoOutputDto> {
    private constructor(
        private readonly torneioGateway: TorneioGateway,
        private readonly partidaGateway: PartidaGateway
    ) { }

    public static criar(
        torneioGateway: TorneioGateway,
        partidaGateway: PartidaGateway
    ) {
        return new AjustarResultado(torneioGateway, partidaGateway);
    }

    public async executar(
        input: AjustarResultadoInputDto
    ): Promise<AjustarResultadoOutputDto> {
        const partida = await this.partidaGateway.buscarPorId(input.partidaId);
        if (!partida) {
            throw ErroPersonalizado.criar({
                mensagem: "Partida não encontrada.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (!partida.contestado) {
            throw ErroPersonalizado.criar({
                mensagem: "A partida não está marcada como contestada.",
                status: StatusErro.erroParametro,
            });
        }

        const torneio = await this.torneioGateway.buscarPorId(partida.torneioId);
        if (!torneio || torneio.status !== "em_andamento") {
            throw ErroPersonalizado.criar({
                mensagem: "Ajustes só são permitidos enquanto o torneio está em andamento.",
                status: StatusErro.erroParametro,
            });
        }

        const ehDono = torneio.donoId === input.requisitanteId;
        if (!ehDono && !input.isAdmin) {
            throw ErroPersonalizado.criar({
                mensagem: "Apenas o dono do torneio ou um administrador podem ajustar um resultado contestado.",
                status: StatusErro.erroProibido,
            });
        }

        const v1 = input.vitoriasJogador1;
        const v2 = input.vitoriasJogador2;

        if (v1 === v2 && torneio.emCorte) {
            throw ErroPersonalizado.criar({
                mensagem: "Empates não são permitidos na fase de corte.",
                status: StatusErro.erroParametro,
            });
        }

        if (v1 > 2 || v2 > 2 || v1 + v2 > 3) {
            throw ErroPersonalizado.criar({
                mensagem: "Placar inválido.",
                status: StatusErro.erroParametro,
            });
        }

        const partidaAjustada = await this.partidaGateway.ajustarResultadoContestado(
            input.partidaId,
            v1,
            v2
        );
        if (!partidaAjustada) {
            throw ErroPersonalizado.criar({
                mensagem: "Não foi possível ajustar a partida. Verifique se ela ainda está contestada.",
                status: StatusErro.erroParametro,
            });
        }

        return {
            id: partidaAjustada.id,
            torneioId: partidaAjustada.torneioId,
            rodada: partidaAjustada.rodada,
            jogador1Id: partidaAjustada.jogador1Id,
            jogador2Id: partidaAjustada.jogador2Id,
            vitoriasJogador1: partidaAjustada.vitoriasJogador1,
            vitoriasJogador2: partidaAjustada.vitoriasJogador2,
            status: partidaAjustada.status,
            contestado: partidaAjustada.contestado,
        };
    }
}
