import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type MeuHistoricoTorneioInputDto = {
    torneioId: string;
    usuarioId: string;
};

export type MeuHistoricoTorneioOutputDto = {
    torneioId: string;
    usuarioId: string;
    partidas: Array<{
        id: string;
        rodada: number;
        oponenteId: string | null;
        oponenteNome: string | null;
        vitoriasJogador: number;
        vitoriasOponente: number;
        resultado: "vitoria" | "derrota" | "empate" | "bye";
        status: string;
    }>;
};

export class MeuHistoricoTorneio
    implements CasoDeUso<MeuHistoricoTorneioInputDto, MeuHistoricoTorneioOutputDto> {
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
        return new MeuHistoricoTorneio(torneioGateway, partidaGateway, usuarioGateway);
    }

    public async executar(
        input: MeuHistoricoTorneioInputDto
    ): Promise<MeuHistoricoTorneioOutputDto> {
        const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
        if (!torneio) {
            throw ErroPersonalizado.criar({
                mensagem: "Torneio não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        const partidas = await this.partidaGateway.listarPorJogadorETorneio(
            input.torneioId,
            input.usuarioId
        );

        const oponenteIds = partidas
            .map((p) =>
                p.jogador1Id === input.usuarioId ? p.jogador2Id : p.jogador1Id
            )
            .filter((id): id is string => !!id);

        const oponentes = oponenteIds.length > 0
            ? await this.usuarioGateway.buscarVarios(oponenteIds)
            : [];
        const oponenteMap = new Map(oponentes.map((u) => [u.id, u]));

        const historicoPartidas = partidas.map((p) => {
            const euSouJogador1 = p.jogador1Id === input.usuarioId;
            const oponenteId = euSouJogador1 ? p.jogador2Id : p.jogador1Id;
            const minhasVitorias = euSouJogador1 ? p.vitoriasJogador1 : p.vitoriasJogador2;
            const vitoriasOponente = euSouJogador1 ? p.vitoriasJogador2 : p.vitoriasJogador1;

            let resultado: "vitoria" | "derrota" | "empate" | "bye";
            if (oponenteId === null) {
                resultado = "bye";
            } else if (p.status !== "finalizada") {
                resultado = "empate"; // pendente — não determinado ainda
            } else if (minhasVitorias > vitoriasOponente) {
                resultado = "vitoria";
            } else if (minhasVitorias < vitoriasOponente) {
                resultado = "derrota";
            } else {
                resultado = "empate";
            }

            return {
                id: p.id,
                rodada: p.rodada,
                oponenteId,
                oponenteNome: oponenteId
                    ? (oponenteMap.get(oponenteId)?.nome ?? oponenteId)
                    : null,
                vitoriasJogador: minhasVitorias,
                vitoriasOponente,
                resultado,
                status: p.status,
            };
        });

        return {
            torneioId: input.torneioId,
            usuarioId: input.usuarioId,
            partidas: historicoPartidas,
        };
    }
}
