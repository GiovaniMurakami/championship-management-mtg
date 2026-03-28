import { Inscricao } from "../../dominio/entidade/inscricao";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";

export type InscreverTorneioInputDto = {
  torneioId: string;
  usuarioId: string;
};

export type InscreverTorneioOutputDto = {
  id: string;
  torneioId: string;
  usuario: { id: string; nome: string };
  checkIn: boolean;
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

    const inscricao = Inscricao.criar({
      torneioId: input.torneioId,
      usuarioId: input.usuarioId,
    });

    await this.inscricaoGateway.salvar(inscricao);

    const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);
    const usuarioNome = usuario?.nome ?? input.usuarioId;

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
      checkIn: inscricao.checkIn,
      criadoEm: inscricao.criadoEm,
    };
  }
}
