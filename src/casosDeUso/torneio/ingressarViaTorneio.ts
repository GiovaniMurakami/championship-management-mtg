import { v4 as uuidv4 } from "uuid";
import { Inscricao } from "../../dominio/entidade/inscricao";
import { Partida } from "../../dominio/entidade/partida";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { LinkIngressoGateway } from "../../dominio/gateway/linkIngressoGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type IngressarViaTorneioInputDto = {
    token: string;
    usuarioId: string;
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
        private readonly linkIngressoGateway: LinkIngressoGateway
    ) { }

    public static criar(
        torneioGateway: TorneioGateway,
        inscricaoGateway: InscricaoGateway,
        partidaGateway: PartidaGateway,
        usuarioGateway: UsuarioGateway,
        linkIngressoGateway: LinkIngressoGateway
    ) {
        return new IngressarViaTorneio(
            torneioGateway,
            inscricaoGateway,
            partidaGateway,
            usuarioGateway,
            linkIngressoGateway
        );
    }

    public async executar(
        input: IngressarViaTorneioInputDto
    ): Promise<IngressarViaTorneioOutputDto> {
        // 1. Validar token
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

        // 2. Validar torneio
        const torneio = await this.torneioGateway.buscarPorId(linkData.torneioId);
        if (!torneio || torneio.status !== "em_andamento") {
            throw ErroPersonalizado.criar({
                mensagem: "Torneio não está em andamento.",
                status: StatusErro.erroParametro,
            });
        }

        // Bloquear entrada tardia durante fase de corte
        if (torneio.emCorte) {
            throw ErroPersonalizado.criar({
                mensagem: "Não é possível ingressar durante a fase eliminatória (corte).",
                status: StatusErro.erroParametro,
            });
        }

        // 3. Validar usuário
        const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);
        if (!usuario) {
            throw ErroPersonalizado.criar({
                mensagem: "Usuário não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (!usuario.nickMTGO) {
            throw ErroPersonalizado.criar({
                mensagem: "É necessário ter um nickMTGO cadastrado para participar do torneio.",
                status: StatusErro.erroParametro,
            });
        }

        // 4. Verificar se já está inscrito
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

        // 5. Consumir token (uso único)
        await this.linkIngressoGateway.excluirPorToken(input.token);

        // 6. Criar inscrição com check-in liberado para todas as rodadas futuras
        const inscricao = Inscricao.criar({
            torneioId: torneio.id,
            usuarioId: input.usuarioId,
        });
        inscricao.checkIn = true;
        inscricao.checkInRodada = Number.MAX_SAFE_INTEGER; // garante participação em todas as rodadas restantes

        await this.inscricaoGateway.salvar(inscricao);

        // Verificar se o novo total de jogadores ativos exige uma rodada adicional
        if (!torneio.emCorte) {
            const todasInscricoes = await this.inscricaoGateway.listarPorTorneio(torneio.id);
            const jogadoresAtivos = todasInscricoes.filter((i) => !i.dropped).length;
            const novoTotal = Math.ceil(Math.log2(Math.max(jogadoresAtivos, 2)));
            const totalComCap = torneio.maxRodadas
                ? Math.min(novoTotal, torneio.maxRodadas)
                : novoTotal;
            if (totalComCap > torneio.totalRodadas) {
                torneio.totalRodadas = totalComCap;
                await this.torneioGateway.atualizar(torneio);
            }
        }

        // 7. Verificar se existe partida BYE na rodada atual
        const byePartida = await this.partidaGateway.buscarByePartidaRodada(
            torneio.id,
            torneio.rodadaAtual
        );

        let partida: Partida;

        if (byePartida) {
            // Caso A: Existe jogador com BYE — novo jogador substitui o BYE.
            // O jogador que tinha o BYE vence 2-0 e o novo jogador perde 0-2.
            // Atualizamos o jogador2 da partida BYE existente.
            const partidaAtualizada = await this.partidaGateway.atualizarJogador2Partida(
                byePartida.id,
                input.usuarioId
            );
            if (!partidaAtualizada) {
                throw ErroPersonalizado.criar({
                    mensagem: "Não foi possível associar o jogador à partida BYE existente.",
                    status: StatusErro.erroParametro,
                });
            }
            partida = partidaAtualizada;
        } else {
            // Caso B: Não existe BYE — novo jogador recebe BYE mas PERDE 0-2
            // (penalidade por entrada tardia no torneio).
            partida = new Partida({
                id: uuidv4(),
                torneioId: torneio.id,
                rodada: torneio.rodadaAtual,
                jogador1Id: input.usuarioId,
                jogador2Id: null, // BYE
                vitoriasJogador1: 0,
                vitoriasJogador2: 2, // "bye" ganha 2-0
                status: "finalizada",
                tipoBye: "penalidade",
                criadoEm: new Date(),
            });
            await this.partidaGateway.salvar(partida);
        }

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
}
