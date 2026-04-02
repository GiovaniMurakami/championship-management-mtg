import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type DroparJogadorInputDto = {
  torneioId: string;
  requisitanteId: string;
  isAdmin: boolean;
  jogadorId: string;
};

export type DroparJogadorOutputDto = {
  inscricaoId: string;
  torneioId: string;
  jogador: { id: string; nome: string };
  dropped: boolean;
};

export class DroparJogador
  implements CasoDeUso<DroparJogadorInputDto, DroparJogadorOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly usuarioGateway: UsuarioGateway,
    private readonly partidaGateway: PartidaGateway
  ) { }

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    usuarioGateway: UsuarioGateway,
    partidaGateway: PartidaGateway
  ) {
    return new DroparJogador(torneioGateway, inscricaoGateway, usuarioGateway, partidaGateway);
  }

  public async executar(
    input: DroparJogadorInputDto
  ): Promise<DroparJogadorOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (torneio.status === "finalizado") {
      throw ErroPersonalizado.criar({
        mensagem: "O torneio já foi finalizado.",
        status: StatusErro.erroParametro,
      });
    }

    const ehDono = torneio.donoId === input.requisitanteId;
    const ehProprioJogador = input.requisitanteId === input.jogadorId;

    if (!ehDono && !ehProprioJogador && !input.isAdmin) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o próprio jogador ou o dono do torneio podem executar esta ação.",
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

    if (inscricao.dropped) {
      throw ErroPersonalizado.criar({
        mensagem: "Jogador já foi dropado deste torneio.",
        status: StatusErro.erroParametro,
      });
    }

    inscricao.dropped = true;
    await this.inscricaoGateway.atualizar(inscricao);

    // Auto-resolve pending matches: give WO (2-0) to the opponent
    if (torneio.status === "em_andamento") {
      const partidas = await this.partidaGateway.listarPorTorneio(input.torneioId);
      const pendentes = partidas.filter(
        (p) =>
          p.status === "pendente" &&
          (p.jogador1Id === input.jogadorId || p.jogador2Id === input.jogadorId)
      );

      for (const partida of pendentes) {
        if (partida.jogador2Id === null) {
          partida.vitoriasJogador1 = 2;
          partida.vitoriasJogador2 = 0;
        } else if (partida.jogador1Id === input.jogadorId) {
          partida.vitoriasJogador1 = 0;
          partida.vitoriasJogador2 = 2;
        } else {
          partida.vitoriasJogador1 = 2;
          partida.vitoriasJogador2 = 0;
        }
        partida.status = "finalizada";
        await this.partidaGateway.atualizar(partida);
      }
    }

    const jogador = await this.usuarioGateway.buscarPorId(inscricao.usuarioId);

    return {
      inscricaoId: inscricao.id,
      torneioId: inscricao.torneioId,
      jogador: { id: inscricao.usuarioId, nome: jogador?.nome ?? inscricao.usuarioId },
      dropped: true,
    };
  }
}
