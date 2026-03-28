import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { eventosTorneio } from "../../infra/socketio/eventosTorneio";

export type EscolherDeckTorneioInputDto = {
  torneioId: string;
  usuarioId: string;
  usuarioNome: string;
  deckId: string;
};

export type EscolherDeckTorneioOutputDto = {
  id: string;
  torneioId: string;
  usuario: { id: string; nome: string };
  deckId: string;
};

export class EscolherDeckTorneio
  implements CasoDeUso<EscolherDeckTorneioInputDto, EscolherDeckTorneioOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly deckGateway: DeckGateway
  ) { }

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    deckGateway: DeckGateway
  ) {
    return new EscolherDeckTorneio(torneioGateway, inscricaoGateway, deckGateway);
  }

  public async executar(
    input: EscolherDeckTorneioInputDto
  ): Promise<EscolherDeckTorneioOutputDto> {
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

    inscricao.deckId = deck.id;
    await this.inscricaoGateway.atualizar(inscricao);

    eventosTorneio.emit("deck_inserido", {
      torneioId: inscricao.torneioId,
      usuarioId: inscricao.usuarioId,
      deckConfirmado: true,
    });

    return {
      id: inscricao.id,
      torneioId: inscricao.torneioId,
      usuario: { id: inscricao.usuarioId, nome: input.usuarioNome },
      deckId: inscricao.deckId!,
    };
  }
}
