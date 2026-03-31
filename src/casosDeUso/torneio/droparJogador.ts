import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";
import { eventosUsuario } from "../../infra/socketio/eventosUsuario";

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
    private readonly usuarioGateway: UsuarioGateway
  ) { }

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    usuarioGateway: UsuarioGateway
  ) {
    return new DroparJogador(torneioGateway, inscricaoGateway, usuarioGateway);
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

    const jogador = await this.usuarioGateway.buscarPorId(inscricao.usuarioId);

    eventosTorneio.emit("jogador_dropado", {
      torneioId: inscricao.torneioId,
      usuarioId: inscricao.usuarioId,
      usuarioNome: jogador?.nome ?? inscricao.usuarioId,
      inscricaoId: inscricao.id,
    });

    eventosUsuario.emit("jogador_dropado", {
      usuarioId: inscricao.usuarioId,
      torneioId: torneio.id,
      torneioNome: torneio.nome,
    });

    return {
      inscricaoId: inscricao.id,
      torneioId: inscricao.torneioId,
      jogador: { id: inscricao.usuarioId, nome: jogador?.nome ?? inscricao.usuarioId },
      dropped: true,
    };
  }
}
