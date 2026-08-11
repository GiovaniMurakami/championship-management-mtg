import { v4 as uuidv4 } from "uuid";
import { Inscricao } from "../../dominio/entidade/inscricao";
import { Partida } from "../../dominio/entidade/partida";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { LinkIngressoGateway } from "../../dominio/gateway/linkIngressoGateway";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";
import { resolverNomeJogador } from "../../helpers/torneio/resolverNomeJogador";
import { clonarDeckParaTorneio } from "./clonarDeckParaTorneio";

export type IngressarViaTorneioInputDto = {
    token: string;
    usuarioId: string;
    deckId: string;
};

export type IngressarViaTorneioOutputDto = {
    inscricaoId: string;
    torneioId: string;
    usuarioId: string;
    partidaId: string;
    rodada: number;
    vitoriasJogador1: number;
    vitoriasJogador2: number;
};

export class IngressarViaTorneio
    implements CasoDeUso<IngressarViaTorneioInputDto, IngressarViaTorneioOutputDto> {
    private constructor(
        private readonly torneioGateway: TorneioGateway,
        private readonly inscricaoGateway: InscricaoGateway,
        private readonly partidaGateway: PartidaGateway,
        private readonly usuarioGateway: UsuarioGateway,
        private readonly linkIngressoGateway: LinkIngressoGateway,
        private readonly deckGateway: DeckGateway
    ) { }

    public static criar(
        torneioGateway: TorneioGateway,
        inscricaoGateway: InscricaoGateway,
        partidaGateway: PartidaGateway,
        usuarioGateway: UsuarioGateway,
        linkIngressoGateway: LinkIngressoGateway,
        deckGateway: DeckGateway
    ) {
        return new IngressarViaTorneio(
            torneioGateway,
            inscricaoGateway,
            partidaGateway,
            usuarioGateway,
            linkIngressoGateway,
            deckGateway
        );
    }

    public async executar(
        input: IngressarViaTorneioInputDto
    ): Promise<IngressarViaTorneioOutputDto> {
        const linkData = await this.linkIngressoGateway.buscarPorToken(input.token);
        if (!linkData) {
            throw ErroPersonalizado.criar({
                mensagem: "Link de ingresso inválido ou expirado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (linkData.expiresAt < new Date()) {
            await this.linkIngressoGateway.excluirPorToken(input.token);
            throw ErroPersonalizado.criar({
                mensagem: "Link de ingresso expirado.",
                status: StatusErro.erroParametro,
            });
        }

        const torneio = await this.torneioGateway.buscarPorId(linkData.torneioId);
        if (!torneio || torneio.status !== "em_andamento") {
            throw ErroPersonalizado.criar({
                mensagem: "Torneio não está em andamento.",
                status: StatusErro.erroParametro,
            });
        }

        if (torneio.emCorte) {
            throw ErroPersonalizado.criar({
                mensagem: "Não é possível ingressar durante a fase eliminatória (corte).",
                status: StatusErro.erroParametro,
            });
        }

        const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);
        if (!usuario) {
            throw ErroPersonalizado.criar({
                mensagem: "Usuário não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (usuario.bloqueadoTorneios) {
            throw ErroPersonalizado.criar({
                mensagem: "Sua conta está bloqueada para inscrição em torneios.",
                status: StatusErro.erroProibido,
            });
        }

        if (!usuario.nickMTGO) {
            throw ErroPersonalizado.criar({
                mensagem: "É necessário ter um nickMTGO cadastrado para participar do torneio.",
                status: StatusErro.erroParametro,
            });
        }

        const inscricaoExistente = await this.inscricaoGateway.buscarPorTorneioEUsuario(
            torneio.id,
            input.usuarioId
        );
        if (inscricaoExistente) {
            throw ErroPersonalizado.criar({
                mensagem: "Você já está inscrito neste torneio.",
                status: StatusErro.erroParametro,
            });
        }

        const deck = await this.deckGateway.buscarPorId(input.deckId);
        if (!deck) {
            throw ErroPersonalizado.criar({
                mensagem: "Deck não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }
        if (deck.usuarioId !== input.usuarioId) {
            throw ErroPersonalizado.criar({
                mensagem: "Este deck não pertence a você.",
                status: StatusErro.erroProibido,
            });
        }

        await this.linkIngressoGateway.excluirPorToken(input.token);

        const deckTravado = clonarDeckParaTorneio(deck, torneio.id);
        await this.deckGateway.salvar(deckTravado);

        const inscricao = Inscricao.criar({
            torneioId: torneio.id,
            usuarioId: input.usuarioId,
        });
        inscricao.checkInRodada = torneio.rodadaAtual;
        inscricao.deckId = deckTravado.id;

        await this.inscricaoGateway.salvar(inscricao);

        if (!torneio.emCorte) {
            const todasInscricoes = await this.inscricaoGateway.listarPorTorneio(torneio.id);
            const jogadoresAtivos = todasInscricoes.filter((i) => !i.dropped).length;
            const rodadasPorQuantidade = Math.ceil(Math.log2(Math.max(jogadoresAtivos, 2)));
            const limiteFaixaAtual = Math.pow(2, torneio.totalRodadas);
            const rodadasComEntradaTardia = jogadoresAtivos >= limiteFaixaAtual
                ? torneio.totalRodadas + 1
                : rodadasPorQuantidade;
            const novoTotal = Math.max(rodadasPorQuantidade, rodadasComEntradaTardia);
            const totalComCap = torneio.maxRodadas
                ? Math.min(novoTotal, torneio.maxRodadas)
                : novoTotal;
            if (totalComCap > torneio.totalRodadas) {
                const totalAnterior = torneio.totalRodadas;
                torneio.totalRodadas = totalComCap;
                await this.torneioGateway.atualizar(torneio);

                eventosTorneio.emit("total_rodadas_alterado", {
                    torneioId: torneio.id,
                    totalRodadasAnterior: totalAnterior,
                    totalRodadas: totalComCap,
                    motivo: "ingresso_tardio",
                });
            }
        }

        const partidasDaRodada = await this.partidaGateway.listarPorTorneioERodada(
            torneio.id,
            torneio.rodadaAtual
        );
        const proximaMesa = this.calcularProximaMesa(partidasDaRodada);

        const partida = new Partida({
            id: uuidv4(),
            torneioId: torneio.id,
            rodada: torneio.rodadaAtual,
            jogador1Id: input.usuarioId,
            jogador2Id: null,
            vitoriasJogador1: 0,
            vitoriasJogador2: 2,
            status: "finalizada",
            tipoBye: "penalidade",
            mesa: proximaMesa,
            criadoEm: new Date(),
        });
        await this.partidaGateway.salvar(partida);

        const usuarioNome = resolverNomeJogador(usuario, torneio.exibirNomeJogador);

        eventosTorneio.emit("jogador_ingressou", {
            torneioId: torneio.id,
            usuarioId: input.usuarioId,
            usuarioNome,
            rodadaIngresso: torneio.rodadaAtual,
            substituiuBye: false,
        });

        return {
            inscricaoId: inscricao.id,
            torneioId: torneio.id,
            usuarioId: input.usuarioId,
            partidaId: partida.id,
            rodada: partida.rodada,
            vitoriasJogador1: partida.vitoriasJogador1,
            vitoriasJogador2: partida.vitoriasJogador2,
        };
    }

    private calcularProximaMesa(partidas: Partida[]): number {
        const maiorMesaAtual = partidas.reduce((maiorMesa, partida) => {
            if (partida.mesa === null || partida.mesa === undefined) return maiorMesa;
            return Math.max(maiorMesa, partida.mesa);
        }, 0);

        return maiorMesaAtual + 1;
    }
}
