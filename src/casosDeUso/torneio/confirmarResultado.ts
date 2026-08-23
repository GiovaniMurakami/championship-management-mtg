import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";

export type ConfirmarResultadoInputDto = {
    partidaId: string;
    usuarioId: string;
};

export type ConfirmarResultadoOutputDto = {
    id: string;
    torneioId: string;
    rodada: number;
    jogador1Id: string;
    jogador2Id: string | null;
    vitoriasJogador1: number;
    vitoriasJogador2: number;
    status: string;
    contestado: boolean;
    confirmadoPor: string[];
    confirmadoPeloUsuario: boolean;
    confirmacao: { count: number; total: number; fullyConfirmed: boolean };
};

export class ConfirmarResultado
    implements CasoDeUso<ConfirmarResultadoInputDto, ConfirmarResultadoOutputDto> {
    private constructor(
        private readonly torneioGateway: TorneioGateway,
        private readonly partidaGateway: PartidaGateway
    ) { }

    public static criar(
        torneioGateway: TorneioGateway,
        partidaGateway: PartidaGateway
    ) {
        return new ConfirmarResultado(torneioGateway, partidaGateway);
    }

    public async executar(
        input: ConfirmarResultadoInputDto
    ): Promise<ConfirmarResultadoOutputDto> {
        const partida = await this.partidaGateway.buscarPorId(input.partidaId);
        if (!partida) {
            throw ErroPersonalizado.criar({
                mensagem: "Partida não encontrada.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (partida.status !== "finalizada") {
            throw ErroPersonalizado.criar({
                mensagem: "Apenas partidas finalizadas podem ser confirmadas.",
                status: StatusErro.erroParametro,
            });
        }

        if (partida.jogador2Id === null) {
            throw ErroPersonalizado.criar({
                mensagem: "Partidas de BYE não precisam de confirmação.",
                status: StatusErro.erroParametro,
            });
        }

        const ehJogador =
            input.usuarioId === partida.jogador1Id ||
            input.usuarioId === partida.jogador2Id;

        if (!ehJogador) {
            throw ErroPersonalizado.criar({
                mensagem: "Apenas os jogadores da partida podem confirmar o resultado.",
                status: StatusErro.erroProibido,
            });
        }

        const torneio = await this.torneioGateway.buscarPorId(partida.torneioId);
        if (!torneio || torneio.status !== "em_andamento") {
            throw ErroPersonalizado.criar({
                mensagem: "Confirmações só são permitidas enquanto o torneio está em andamento.",
                status: StatusErro.erroParametro,
            });
        }

        const partidaAtualizada = await this.partidaGateway.confirmarResultado(
            input.partidaId,
            input.usuarioId
        );

        if (!partidaAtualizada) {
            throw ErroPersonalizado.criar({
                mensagem: "Resultado já confirmado por este jogador.",
                status: StatusErro.erroParametro,
            });
        }
        eventosTorneio.emit("resultado_confirmado", {
            torneioId: partidaAtualizada.torneioId,
            partidaId: partidaAtualizada.id,
            usuarioId: input.usuarioId,
            rodada: partidaAtualizada.rodada,
        });

        const confirmadoPor = partidaAtualizada.confirmadoPor ?? [];

        return {
            id: partidaAtualizada.id,
            torneioId: partidaAtualizada.torneioId,
            rodada: partidaAtualizada.rodada,
            jogador1Id: partidaAtualizada.jogador1Id,
            jogador2Id: partidaAtualizada.jogador2Id,
            vitoriasJogador1: partidaAtualizada.vitoriasJogador1,
            vitoriasJogador2: partidaAtualizada.vitoriasJogador2,
            status: partidaAtualizada.status,
            contestado: partidaAtualizada.contestado,
            confirmadoPor,
            confirmadoPeloUsuario: confirmadoPor.some((id) => String(id) === String(input.usuarioId)),
            confirmacao: {
                count: [partidaAtualizada.jogador1Id, partidaAtualizada.jogador2Id]
                    .filter((id): id is string => !!id)
                    .filter((id) => confirmadoPor.some((confirmadoId) => String(confirmadoId) === String(id))).length,
                total: partidaAtualizada.jogador2Id ? 2 : 1,
                fullyConfirmed: partidaAtualizada.jogador2Id
                    ? [partidaAtualizada.jogador1Id, partidaAtualizada.jogador2Id].every((id) => confirmadoPor.some((confirmadoId) => String(confirmadoId) === String(id)))
                    : true,
            },
        };
    }
}
