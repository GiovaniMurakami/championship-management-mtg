import { v4 as uuidv4 } from "uuid";
import { Inscricao } from "../../dominio/entidade/inscricao";
import { Partida } from "../../dominio/entidade/partida";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type InscreverTardeTorneioInputDto = {
    torneioId: string;
    usuarioId: string;
    requisitanteId: string;
    isAdmin: boolean;
};

export type InscreverTardeTorneioOutputDto = {
    inscricaoId: string;
    partidaByeId: string;
    torneioId: string;
    usuario: { id: string; nome: string };
    rodada: number;
};

export class InscreverTardeTorneio
    implements CasoDeUso<InscreverTardeTorneioInputDto, InscreverTardeTorneioOutputDto> {
    private constructor(
        private readonly torneioGateway: TorneioGateway,
        private readonly inscricaoGateway: InscricaoGateway,
        private readonly partidaGateway: PartidaGateway,
        private readonly usuarioGateway: UsuarioGateway
    ) { }

    public static criar(
        torneioGateway: TorneioGateway,
        inscricaoGateway: InscricaoGateway,
        partidaGateway: PartidaGateway,
        usuarioGateway: UsuarioGateway
    ) {
        return new InscreverTardeTorneio(torneioGateway, inscricaoGateway, partidaGateway, usuarioGateway);
    }

    public async executar(
        input: InscreverTardeTorneioInputDto
    ): Promise<InscreverTardeTorneioOutputDto> {
        const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
        if (!torneio) {
            throw ErroPersonalizado.criar({
                mensagem: "Torneio não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (torneio.status !== "em_andamento") {
            throw ErroPersonalizado.criar({
                mensagem: "O ingresso tardio só é permitido enquanto o torneio está em andamento.",
                status: StatusErro.erroParametro,
            });
        }

        const ehDono = torneio.donoId === input.requisitanteId;
        if (!ehDono && !input.isAdmin) {
            throw ErroPersonalizado.criar({
                mensagem: "Apenas o dono do torneio ou um administrador pode adicionar jogadores tardiamente.",
                status: StatusErro.erroProibido,
            });
        }

        const inscricaoExistente = await this.inscricaoGateway.buscarPorTorneioEUsuario(
            input.torneioId,
            input.usuarioId
        );
        if (inscricaoExistente) {
            throw ErroPersonalizado.criar({
                mensagem: "Este jogador já está inscrito no torneio.",
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

        // Inscreve com check-in já marcado para a rodada atual
        const inscricao = new Inscricao({
            id: uuidv4(),
            torneioId: input.torneioId,
            usuarioId: input.usuarioId,
            checkInRodada: torneio.rodadaAtual,
            dropped: false,
            byeCount: 1,
            criadoEm: new Date(),
        });

        // Bye de penalidade: jogador perde a rodada atual (vitoriasJogador1=0, vitoriasJogador2=2)
        const partidaBye = new Partida({
            id: uuidv4(),
            torneioId: input.torneioId,
            rodada: torneio.rodadaAtual,
            jogador1Id: input.usuarioId,
            jogador2Id: null,
            vitoriasJogador1: 0,
            vitoriasJogador2: 2,
            status: "finalizada",
            tipoBye: "penalidade",
            criadoEm: new Date(),
        });

        await this.inscricaoGateway.salvar(inscricao);
        await this.partidaGateway.salvar(partidaBye);

        return {
            inscricaoId: inscricao.id,
            partidaByeId: partidaBye.id,
            torneioId: input.torneioId,
            usuario: { id: usuario.id, nome: usuario.nome },
            rodada: torneio.rodadaAtual,
        };
    }
}
