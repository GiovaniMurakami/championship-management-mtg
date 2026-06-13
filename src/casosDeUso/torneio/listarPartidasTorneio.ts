import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { ExibirNomeJogador } from "../../dominio/entidade/torneio";
import { Usuario } from "../../dominio/entidade/usuario";

function resolverNome(u: Usuario, modo: ExibirNomeJogador): string {
    if (modo === "nickMOL") return u.nickMTGO ?? u.nome;
    if (modo === "nickArena") return u.nickArena ?? u.nome;
    return u.nome;
}
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
        contestado: boolean;
        confirmadoPor: string[];
        confirmacao: { count: number; total: number; fullyConfirmed: boolean };
        mesa: number | null;
    }>;
};

export class ListarPartidasTorneio
    implements CasoDeUso<ListarPartidasTorneioInputDto, ListarPartidasTorneioOutputDto> {
    private constructor(
        private readonly torneioGateway: TorneioGateway,
        private readonly partidaGateway: PartidaGateway,
        private readonly usuarioGateway: UsuarioGateway
    ) { }

    public static criar(
        torneioGateway: TorneioGateway,
        partidaGateway: PartidaGateway,
        usuarioGateway: UsuarioGateway
    ) {
        return new ListarPartidasTorneio(torneioGateway, partidaGateway, usuarioGateway);
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

        const jogadorIds = Array.from(new Set(
            partidas.flatMap((p) => [p.jogador1Id, ...(p.jogador2Id ? [p.jogador2Id] : [])])
        ));
        const usuarios = jogadorIds.length > 0 ? await this.usuarioGateway.buscarVarios(jogadorIds) : [];
        const nomeMap = new Map(usuarios.map((u) => [u.id, resolverNome(u, torneio.exibirNomeJogador)]));

        const criarResumoConfirmacao = (p: typeof partidas[number]) => {
            if (!p.jogador2Id) return { count: 0, total: 0, fullyConfirmed: true };
            const confirmadoPor = p.confirmadoPor ?? [];
            const count = [p.jogador1Id, p.jogador2Id]
                .filter((id): id is string => !!id)
                .filter((id) => confirmadoPor.some((confirmadoId) => String(confirmadoId) === String(id))).length;
            return { count, total: 2, fullyConfirmed: count >= 2 };
        };

        return {
            torneioId: input.torneioId,
            rodada: input.rodada,
            partidas: partidas.map((p) => ({
                id: p.id,
                rodada: p.rodada,
                jogador1Id: p.jogador1Id,
                jogador1Nome: nomeMap.get(p.jogador1Id) ?? p.jogador1Id,
                jogador2Id: p.jogador2Id,
                jogador2Nome: p.jogador2Id ? (nomeMap.get(p.jogador2Id) ?? p.jogador2Id) : null,
                deckJogador1Id: p.deckJogador1Id,
                deckJogador2Id: p.deckJogador2Id,
                vitoriasJogador1: p.vitoriasJogador1,
                vitoriasJogador2: p.vitoriasJogador2,
                status: p.status,
                contestado: p.contestado,
                confirmadoPor: p.confirmadoPor,
                confirmacao: criarResumoConfirmacao(p),
                mesa: p.mesa,
            })),
        };
    }
}
