import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";

export type ContestarResultadoInputDto = {
    partidaId: string;
    usuarioId: string;
    isAdmin: boolean;
    observacao?: string;
};

export type ContestarResultadoOutputDto = {
    id: string;
    torneioId: string;
    rodada: number;
    jogador1Id: string;
    jogador2Id: string | null;
    vitoriasJogador1: number;
    vitoriasJogador2: number;
    status: string;
    contestado: boolean;
    observacaoContestacao: string | null;
};

export class ContestarResultado
    implements CasoDeUso<ContestarResultadoInputDto, ContestarResultadoOutputDto> {
    private constructor(
        private readonly torneioGateway: TorneioGateway,
        private readonly partidaGateway: PartidaGateway
    ) { }

    public static criar(
        torneioGateway: TorneioGateway,
        partidaGateway: PartidaGateway
    ) {
        return new ContestarResultado(torneioGateway, partidaGateway);
    }

    public async executar(
        input: ContestarResultadoInputDto
    ): Promise<ContestarResultadoOutputDto> {
        const partida = await this.partidaGateway.buscarPorId(input.partidaId);
        if (!partida) {
            throw ErroPersonalizado.criar({
                mensagem: "Partida não encontrada.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (partida.status !== "finalizada") {
            throw ErroPersonalizado.criar({
                mensagem: "Apenas partidas finalizadas podem ser contestadas.",
                status: StatusErro.erroParametro,
            });
        }

        // Impedir contestação de partidas BYE (jogador2Id === null)
        if (partida.jogador2Id === null) {
            throw ErroPersonalizado.criar({
                mensagem: "Partidas de BYE não podem ser contestadas.",
                status: StatusErro.erroParametro,
            });
        }

        const torneio = await this.torneioGateway.buscarPorId(partida.torneioId);
        if (!torneio || torneio.status !== "em_andamento") {
            throw ErroPersonalizado.criar({
                mensagem: "Contestações só são permitidas enquanto o torneio está em andamento.",
                status: StatusErro.erroParametro,
            });
        }

        // Impedir contestação se já existem rodadas posteriores geradas
        const existeRodadaPosterior = await this.partidaGateway.existePartidaRodadaPosterior(
            partida.torneioId,
            partida.rodada
        );
        if (existeRodadaPosterior) {
            throw ErroPersonalizado.criar({
                mensagem: "Não é possível contestar partida de rodada anterior. Rodadas subsequentes já foram geradas.",
                status: StatusErro.erroParametro,
            });
        }

        const ehJogador =
            input.usuarioId === partida.jogador1Id ||
            input.usuarioId === partida.jogador2Id;
        const podeGerenciar = podeGerenciarTorneio(torneio, input.usuarioId, input.isAdmin);

        if (!ehJogador && !podeGerenciar) {
            throw ErroPersonalizado.criar({
                mensagem: "Apenas os jogadores da partida, dono, anfitrião ou administrador do torneio podem contestar o resultado.",
                status: StatusErro.erroProibido,
            });
        }

        const partidaContestada = await this.partidaGateway.contestarPartida(
            input.partidaId,
            input.observacao
        );
        if (!partidaContestada) {
            throw ErroPersonalizado.criar({
                mensagem: "Não foi possível contestar a partida. Tente novamente.",
                status: StatusErro.erroParametro,
            });
        }

        return {
            id: partidaContestada.id,
            torneioId: partidaContestada.torneioId,
            rodada: partidaContestada.rodada,
            jogador1Id: partidaContestada.jogador1Id,
            jogador2Id: partidaContestada.jogador2Id,
            vitoriasJogador1: partidaContestada.vitoriasJogador1,
            vitoriasJogador2: partidaContestada.vitoriasJogador2,
            status: partidaContestada.status,
            contestado: partidaContestada.contestado,
            observacaoContestacao: partidaContestada.observacaoContestacao,
        };
    }
}
