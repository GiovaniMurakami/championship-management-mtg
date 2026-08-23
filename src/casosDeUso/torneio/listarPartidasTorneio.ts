import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import {
  isUsuarioExcluido,
  resolverNomeJogador as resolverNome,
} from "../../helpers/torneio/resolverNomeJogador";
import { CacheDynamoDbServico, getCacheTtlSegundos } from "../../infra/services/cacheDynamoDbServico";
import { cachePkTorneio, cacheSkPartidas } from "../../helpers/cache/chavesCache";

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
        jogador1Excluido: boolean;
        jogador2Id: string | null;
        jogador2Nome: string | null;
        jogador2Excluido: boolean;
        deckJogador1Id?: string;
        deckJogador2Id?: string | null;
        vitoriasJogador1: number;
        vitoriasJogador2: number;
        status: string;
        contestado: boolean;
        observacaoContestacao?: string | null;
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
        private readonly usuarioGateway: UsuarioGateway,
        private readonly cache?: CacheDynamoDbServico
    ) { }

    public static criar(
        torneioGateway: TorneioGateway,
        partidaGateway: PartidaGateway,
        usuarioGateway: UsuarioGateway,
        cache?: CacheDynamoDbServico
    ) {
        return new ListarPartidasTorneio(torneioGateway, partidaGateway, usuarioGateway, cache);
    }

    public async executar(
        input: ListarPartidasTorneioInputDto
    ): Promise<ListarPartidasTorneioOutputDto> {
        const cachePk = cachePkTorneio(input.torneioId);
        const cacheSk = cacheSkPartidas(input.rodada);
        const cacheado = await this.cache?.buscar<ListarPartidasTorneioOutputDto>(cachePk, cacheSk);
        if (cacheado) return cacheado;

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
        const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));

        const criarResumoConfirmacao = (p: typeof partidas[number]) => {
            if (!p.jogador2Id) return { count: 0, total: 0, fullyConfirmed: true };
            const confirmadoPor = p.confirmadoPor ?? [];
            const count = [p.jogador1Id, p.jogador2Id]
                .filter((id): id is string => !!id)
                .filter((id) => confirmadoPor.some((confirmadoId) => String(confirmadoId) === String(id))).length;
            return { count, total: 2, fullyConfirmed: count >= 2 };
        };

        const saida = {
            torneioId: input.torneioId,
            rodada: input.rodada,
            partidas: partidas.map((p) => {
                const u1 = usuarioMap.get(p.jogador1Id);
                const u2 = p.jogador2Id ? usuarioMap.get(p.jogador2Id) : undefined;
                return {
                id: p.id,
                rodada: p.rodada,
                jogador1Id: p.jogador1Id,
                jogador1Nome: u1 ? resolverNome(u1, torneio.exibirNomeJogador) : p.jogador1Id,
                jogador1Excluido: isUsuarioExcluido(u1),
                jogador2Id: p.jogador2Id,
                jogador2Nome: p.jogador2Id
                    ? (u2 ? resolverNome(u2, torneio.exibirNomeJogador) : p.jogador2Id)
                    : null,
                jogador2Excluido: p.jogador2Id ? isUsuarioExcluido(u2) : false,
                deckJogador1Id: p.deckJogador1Id,
                deckJogador2Id: p.deckJogador2Id,
                vitoriasJogador1: p.vitoriasJogador1,
                vitoriasJogador2: p.vitoriasJogador2,
                status: p.status,
                contestado: p.contestado,
                observacaoContestacao: p.observacaoContestacao ?? null,
                confirmadoPor: p.confirmadoPor,
                confirmacao: criarResumoConfirmacao(p),
                mesa: p.mesa,
                };
            }),
        };
        await this.cache?.salvar(cachePk, cacheSk, saida, getCacheTtlSegundos("DYNAMODB_CACHE_TTL_TORNEIO_SECONDS", 60));
        return saida;
    }
}
