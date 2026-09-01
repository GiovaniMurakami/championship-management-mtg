import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";
import { formatarDataHoraBrasilia } from "../../helpers/data/brasilia";
import { resolverNomeJogador } from "../../helpers/torneio/resolverNomeJogador";

export type CheckInTorneioInputDto = {
  torneioId: string;
  usuarioId: string;
  /** Fallback se o usuário não for encontrado no gateway. */
  usuarioNome?: string;
};

export type CheckInTorneioOutputDto = {
  id: string;
  torneioId: string;
  usuario: { id: string; nome: string };
  checkInRodada: number;
};

export class CheckInTorneio
  implements CasoDeUso<CheckInTorneioInputDto, CheckInTorneioOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly usuarioGateway: UsuarioGateway,
  ) { }

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    usuarioGateway: UsuarioGateway,
  ) {
    return new CheckInTorneio(torneioGateway, inscricaoGateway, usuarioGateway);
  }

  public async executar(
    input: CheckInTorneioInputDto
  ): Promise<CheckInTorneioOutputDto> {
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

    const inscricao = await this.inscricaoGateway.buscarPorTorneioEUsuario(
      input.torneioId,
      input.usuarioId
    );

    if (!inscricao) {
      throw ErroPersonalizado.criar({
        mensagem: "Você não está inscrito neste torneio.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    let checkinJaRealizado = false;

    if (torneio.status === "inscricoes_abertas") {
      const umHoraAntes = new Date(torneio.horario.getTime() - 60 * 60 * 1000);
      if (new Date() < umHoraAntes) {
        throw ErroPersonalizado.criar({
          mensagem: `O check-in só abre 1 hora antes do torneio (a partir de ${formatarDataHoraBrasilia(umHoraAntes)}, horário de Brasília).`,
          status: StatusErro.erroParametro,
        });
      }
      if (inscricao.checkInRodada >= 0) {
        checkinJaRealizado = true;
      } else {
        inscricao.checkInRodada = 0;
      }
    } else {
      if (inscricao.checkInRodada >= torneio.rodadaAtual) {
        checkinJaRealizado = true;
      } else {
        inscricao.checkInRodada = torneio.rodadaAtual;
      }
    }

    if (!checkinJaRealizado) {
      await this.inscricaoGateway.atualizar(inscricao);
    }

    const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);
    const usuarioNome = usuario
      ? resolverNomeJogador(usuario, torneio.exibirNomeJogador)
      : (input.usuarioNome ?? input.usuarioId);

    if (!checkinJaRealizado) {
      eventosTorneio.emit("checkin_realizado", {
        torneioId: inscricao.torneioId,
        usuarioId: inscricao.usuarioId,
        usuarioNome,
        checkInRodada: inscricao.checkInRodada,
      });
    }

    return {
      id: inscricao.id,
      torneioId: inscricao.torneioId,
      usuario: { id: inscricao.usuarioId, nome: usuarioNome },
      checkInRodada: inscricao.checkInRodada,
    };
  }
}
