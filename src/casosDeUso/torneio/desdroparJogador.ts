import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";
import { resolverNomeJogador } from "../../helpers/torneio/resolverNomeJogador";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";

export type DesdroparJogadorInputDto = {
  torneioId: string;
  requisitanteId: string;
  isAdmin: boolean;
  jogadorId: string;
};

export type DesdroparJogadorOutputDto = {
  inscricaoId: string;
  torneioId: string;
  jogador: { id: string; nome: string };
  dropped: boolean;
  partidasReabertas: string[];
};

export class DesdroparJogador
  implements CasoDeUso<DesdroparJogadorInputDto, DesdroparJogadorOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly usuarioGateway: UsuarioGateway,
    private readonly partidaGateway: PartidaGateway
  ) {}

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    usuarioGateway: UsuarioGateway,
    partidaGateway: PartidaGateway
  ) {
    return new DesdroparJogador(torneioGateway, inscricaoGateway, usuarioGateway, partidaGateway);
  }

  public async executar(
    input: DesdroparJogadorInputDto
  ): Promise<DesdroparJogadorOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (torneio.status !== "em_andamento") {
      throw ErroPersonalizado.criar({
        mensagem: "Só é possível voltar ao torneio enquanto ele está em andamento.",
        status: StatusErro.erroParametro,
      });
    }

    const ehProprioJogador = input.requisitanteId === input.jogadorId;
    const podeGerenciar = podeGerenciarTorneio(torneio, input.requisitanteId, input.isAdmin);

    if (!podeGerenciar && !ehProprioJogador) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o próprio jogador, dono, anfitrião ou administrador do torneio podem executar esta ação.",
        status: StatusErro.erroProibido,
      });
    }

    const inscricao = await this.inscricaoGateway.buscarPorTorneioEUsuario(
      input.torneioId,
      input.jogadorId
    );

    if (!inscricao) {
      throw ErroPersonalizado.criar({
        mensagem: "Jogador não está inscrito neste torneio.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (!inscricao.dropped) {
      throw ErroPersonalizado.criar({
        mensagem: "Jogador não está dropado deste torneio.",
        status: StatusErro.erroParametro,
      });
    }

    if (inscricao.droppedRodada !== torneio.rodadaAtual) {
      throw ErroPersonalizado.criar({
        mensagem: "Só é possível voltar ao torneio na mesma rodada em que o jogador foi dropado.",
        status: StatusErro.erroParametro,
      });
    }

    const partidasReabertas: string[] = [];
    const dropPartidaIds = new Set(inscricao.dropPartidaIds ?? []);

    for (const partidaId of dropPartidaIds) {
      const partida = await this.partidaGateway.buscarPorId(partidaId);
      if (!partida) continue;

      const pertenceAoJogador =
        partida.jogador1Id === input.jogadorId || partida.jogador2Id === input.jogadorId;

      if (
        partida.torneioId !== input.torneioId ||
        partida.rodada !== torneio.rodadaAtual ||
        !pertenceAoJogador ||
        partida.status !== "finalizada" ||
        partida.contestado ||
        partida.confirmadoPor.length > 0
      ) {
        throw ErroPersonalizado.criar({
          mensagem: "Não é possível desfazer o drop porque uma partida resolvida automaticamente já foi alterada.",
          status: StatusErro.erroParametro,
        });
      }

      partida.vitoriasJogador1 = 0;
      partida.vitoriasJogador2 = 0;
      partida.status = "pendente";
      partida.confirmadoPor = [];
      await this.partidaGateway.atualizar(partida);
      partidasReabertas.push(partida.id);
    }

    inscricao.dropped = false;
    inscricao.droppedRodada = null;
    inscricao.dropPartidaIds = [];
    await this.inscricaoGateway.atualizar(inscricao);

    const jogador = await this.usuarioGateway.buscarPorId(inscricao.usuarioId);
    const jogadorNome = jogador
      ? resolverNomeJogador(jogador, torneio.exibirNomeJogador)
      : input.jogadorId;

    eventosTorneio.emit("jogador_voltou", {
      torneioId: input.torneioId,
      jogadorId: input.jogadorId,
      jogadorNome,
      partidasReabertas,
    });

    return {
      inscricaoId: inscricao.id,
      torneioId: inscricao.torneioId,
      jogador: { id: inscricao.usuarioId, nome: jogadorNome },
      dropped: false,
      partidasReabertas,
    };
  }
}
