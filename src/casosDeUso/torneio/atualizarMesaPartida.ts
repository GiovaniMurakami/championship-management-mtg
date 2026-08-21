import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";

export type AtualizarMesaPartidaInputDto = {
    partidaId: string;
    mesa: number | null;
    requisitanteId: string;
    isAdmin: boolean;
};

export type AtualizarMesaPartidaOutputDto = {
    id: string;
    torneioId: string;
    rodada: number;
    jogador1Id: string;
    jogador2Id: string | null;
    mesa: number | null;
};

export class AtualizarMesaPartida
    implements CasoDeUso<AtualizarMesaPartidaInputDto, AtualizarMesaPartidaOutputDto> {
    private constructor(
        private readonly torneioGateway: TorneioGateway,
        private readonly partidaGateway: PartidaGateway
    ) { }

    public static criar(
        torneioGateway: TorneioGateway,
        partidaGateway: PartidaGateway
    ) {
        return new AtualizarMesaPartida(torneioGateway, partidaGateway);
    }

    public async executar(
        input: AtualizarMesaPartidaInputDto
    ): Promise<AtualizarMesaPartidaOutputDto> {
        const partida = await this.partidaGateway.buscarPorId(input.partidaId);
        if (!partida) {
            throw ErroPersonalizado.criar({
                mensagem: "Partida não encontrada.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        const torneio = await this.torneioGateway.buscarPorId(partida.torneioId);
        if (!torneio) {
            throw ErroPersonalizado.criar({
                mensagem: "Torneio não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (torneio.status !== "em_andamento") {
            throw ErroPersonalizado.criar({
                mensagem: "Mesas só podem ser alteradas enquanto o torneio está em andamento.",
                status: StatusErro.erroParametro,
            });
        }

        if (!podeGerenciarTorneio(torneio, input.requisitanteId, input.isAdmin)) {
            throw ErroPersonalizado.criar({
                mensagem: "Apenas o dono, anfitrião ou administrador do torneio pode alterar mesas.",
                status: StatusErro.erroProibido,
            });
        }

        if (input.mesa !== null && (!Number.isInteger(input.mesa) || input.mesa < 1)) {
            throw ErroPersonalizado.criar({
                mensagem: "Mesa deve ser um número inteiro maior ou igual a 1.",
                status: StatusErro.erroParametro,
            });
        }

        const partidaAtualizada = await this.partidaGateway.atualizarMesa(input.partidaId, input.mesa);
        if (!partidaAtualizada) {
            throw ErroPersonalizado.criar({
                mensagem: "Não foi possível atualizar a mesa.",
                status: StatusErro.erroParametro,
            });
        }
        eventosTorneio.emit("mesa_atualizada", {
            torneioId: partidaAtualizada.torneioId,
            partidaId: partidaAtualizada.id,
            rodada: partidaAtualizada.rodada,
            mesa: partidaAtualizada.mesa,
        });

        return {
            id: partidaAtualizada.id,
            torneioId: partidaAtualizada.torneioId,
            rodada: partidaAtualizada.rodada,
            jogador1Id: partidaAtualizada.jogador1Id,
            jogador2Id: partidaAtualizada.jogador2Id,
            mesa: partidaAtualizada.mesa,
        };
    }
}
