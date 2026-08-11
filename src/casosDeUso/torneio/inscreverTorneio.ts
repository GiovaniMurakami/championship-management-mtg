import { Inscricao } from "../../dominio/entidade/inscricao";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";
import { resolverNomeJogador } from "../../helpers/torneio/resolverNomeJogador";

export type InscreverTorneioInputDto = {
  torneioId: string;
  usuarioId: string;
};

export type InscreverTorneioOutputDto = {
  id: string;
  torneioId: string;
  usuario: { id: string; nome: string };
  checkInRodada: number;
  criadoEm: Date;
};

export class InscreverTorneio
  implements CasoDeUso<InscreverTorneioInputDto, InscreverTorneioOutputDto> {
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
    return new InscreverTorneio(torneioGateway, inscricaoGateway, usuarioGateway);
  }

  public async executar(
    input: InscreverTorneioInputDto
  ): Promise<InscreverTorneioOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (torneio.status !== "inscricoes_abertas") {
      throw ErroPersonalizado.criar({
        mensagem: "As inscrições para este torneio estão encerradas.",
        status: StatusErro.erroParametro,
      });
    }

    const inscricaoExistente =
      await this.inscricaoGateway.buscarPorTorneioEUsuario(
        input.torneioId,
        input.usuarioId
      );

    if (inscricaoExistente) {
      throw ErroPersonalizado.criar({
        mensagem: "Você já está inscrito neste torneio.",
        status: StatusErro.erroParametro,
      });
    }

    if (torneio.maxJogadores) {
      const contagem = await this.inscricaoGateway.contarPorTorneios([input.torneioId]);
      const totalInscritos = contagem[input.torneioId] ?? 0;
      if (totalInscritos >= torneio.maxJogadores) {
        throw ErroPersonalizado.criar({
          mensagem: `O torneio atingiu o limite máximo de ${torneio.maxJogadores} jogadores.`,
          status: StatusErro.erroParametro,
        });
      }
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
        mensagem: "É necessário configurar um nick do MTGO na sua conta antes de se inscrever em um torneio.",
        status: StatusErro.erroParametro,
      });
    }

    const inscricao = Inscricao.criar({
      torneioId: input.torneioId,
      usuarioId: input.usuarioId,
    });

    await this.inscricaoGateway.salvar(inscricao);

    // Re-verify maxJogadores after insert to handle race condition
    if (torneio.maxJogadores) {
      const contagemPos = await this.inscricaoGateway.contarPorTorneios([input.torneioId]);
      const totalPosInsert = contagemPos[input.torneioId] ?? 0;
      if (totalPosInsert > torneio.maxJogadores) {
        await this.inscricaoGateway.excluir(inscricao.id);
        throw ErroPersonalizado.criar({
          mensagem: `O torneio atingiu o limite máximo de ${torneio.maxJogadores} jogadores.`,
          status: StatusErro.erroParametro,
        });
      }
    }

    const usuarioNome = resolverNomeJogador(usuario, torneio.exibirNomeJogador);

    eventosTorneio.emit("participante_inscrito", {
      torneioId: inscricao.torneioId,
      usuarioId: inscricao.usuarioId,
      usuarioNome,
      inscricaoId: inscricao.id,
    });

    return {
      id: inscricao.id,
      torneioId: inscricao.torneioId,
      usuario: { id: inscricao.usuarioId, nome: usuarioNome },
      checkInRodada: inscricao.checkInRodada,
      criadoEm: inscricao.criadoEm,
    };
  }
}
