import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type ExcluirDeckInputDto = {
  id: string;
  usuarioIdRequisitante: string;
};

export type ExcluirDeckOutputDto = {
  mensagem: string;
};

export class ExcluirDeck
  implements CasoDeUso<ExcluirDeckInputDto, ExcluirDeckOutputDto>
{
  private constructor(private readonly deckGateway: DeckGateway) {}

  public static criar(deckGateway: DeckGateway) {
    return new ExcluirDeck(deckGateway);
  }

  public async executar(
    input: ExcluirDeckInputDto
  ): Promise<ExcluirDeckOutputDto> {
    const deck = await this.deckGateway.buscarPorId(input.id);

    if (!deck) {
      throw ErroPersonalizado.criar({
        mensagem: "Deck não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (deck.usuarioId !== input.usuarioIdRequisitante) {
      throw ErroPersonalizado.criar({
        mensagem: "Sem permissão para excluir este deck.",
        status: StatusErro.erroProibido,
      });
    }

    await this.deckGateway.excluir(input.id);

    return { mensagem: "Deck excluído com sucesso." };
  }
}
