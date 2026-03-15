import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type ListarPartidasTorneioInputDto = {
    torneioId: string;
    rodada?: number;
};

export type ListarPartidasTorneioOutputDto = {
    torneioId: string;
    rodada?: number;
    partidas: Array<{
        id: string;
        rodada: number;
        jogador1Id: string;
        jogador1Nome: string;
        jogador2Id: string | null;
        jogador2Nome: string | null;
        deckJogador1Id?: string;
        deckJogador2Id?: string | null;
        vitoriasJogador1: number;
        vitoriasJogador2: number;
        status: string;
    }>;
};

export class ListarPartidasTorneio
    implements CasoDeUso<ListarPartidasTorneioInputDto, ListarPartidasTorneioOutputDto> {
    private constructor(
        private readonly torneioGateway: TorneioGateway,
        private readonly partidaGateway: PartidaGateway
    ) { }

    public static criar(
        torneioGateway: TorneioGateway,
        partidaGateway: PartidaGateway
    ) {
        return new ListarPartidasTorneio(torneioGateway, partidaGateway);
    }

    public async executar(
        input: ListarPartidasTorneioInputDto
    ): Promise<ListarPartidasTorneioOutputDto> {
        const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
        if (!torneio) {
            throw ErroPersonalizado.criar({
                mensagem: "Torneio não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (input.rodada !== undefined && (!Number.isInteger(input.rodada) || input.rodada < 1)) {
            throw ErroPersonalizado.criar({
                mensagem: "Rodada inválida. Informe um número inteiro maior ou igual a 1.",
                status: StatusErro.erroParametro,
            });
        }

        const partidas = input.rodada === undefined
            ? await this.partidaGateway.listarPorTorneio(input.torneioId)
            : await this.partidaGateway.listarPorTorneioERodada(input.torneioId, input.rodada);

        return {
            torneioId: input.torneioId,
            rodada: input.rodada,
            partidas: partidas.map((p) => ({
                id: p.id,
                rodada: p.rodada,
                jogador1Id: p.jogador1Id,
                jogador1Nome: p.jogador1Nome ?? p.jogador1Id,
                jogador2Id: p.jogador2Id,
                jogador2Nome: p.jogador2Id ? (p.jogador2Nome ?? p.jogador2Id) : null,
                deckJogador1Id: p.deckJogador1Id,
                deckJogador2Id: p.deckJogador2Id,
                vitoriasJogador1: p.vitoriasJogador1,
                vitoriasJogador2: p.vitoriasJogador2,
                status: p.status,
            })),
        };
    }
}
