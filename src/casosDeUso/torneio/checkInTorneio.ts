import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";

export type CheckInTorneioInputDto = {
  torneioId: string;
  usuarioId: string;
  usuarioNome: string;
};

export type CheckInTorneioOutputDto = {
  id: string;
  torneioId: string;
  usuario: { id: string; nome: string };
  checkIn: boolean;
  checkInRodada: number;
};

export class CheckInTorneio
  implements CasoDeUso<CheckInTorneioInputDto, CheckInTorneioOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway
  ) { }

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway
  ) {
    return new CheckInTorneio(torneioGateway, inscricaoGateway);
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

    if (torneio.status === "inscricoes_abertas") {
      const umHoraAntes = new Date(torneio.horario.getTime() - 60 * 60 * 1000);
      if (new Date() < umHoraAntes) {
        throw ErroPersonalizado.criar({
          mensagem: `O check-in só abre 1 hora antes do torneio (a partir de ${umHoraAntes.toISOString()}).`,
          status: StatusErro.erroParametro,
        });
      }
      inscricao.checkIn = true;
      inscricao.checkInRodada = 0;
    } else {
      // Check-in entre rodadas (em_andamento)
      if (!inscricao.checkIn) {
        throw ErroPersonalizado.criar({
          mensagem: "Você não completou o check-in inicial deste torneio.",
          status: StatusErro.erroParametro,
        });
      }
      inscricao.checkInRodada = torneio.rodadaAtual;
    }

    await this.inscricaoGateway.atualizar(inscricao);

    eventosTorneio.emit("checkin_realizado", {
      torneioId: inscricao.torneioId,
      usuarioId: inscricao.usuarioId,
      checkInRodada: inscricao.checkInRodada,
    });

    return {
      id: inscricao.id,
      torneioId: inscricao.torneioId,
      usuario: { id: inscricao.usuarioId, nome: input.usuarioNome },
      checkIn: inscricao.checkIn,
      checkInRodada: inscricao.checkInRodada,
    };
  }
}
