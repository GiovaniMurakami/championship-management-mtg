import { Carta, Deck } from "../../dominio/entidade/deck";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { CasoDeUso } from "../casoDeUso";

export type ListarDecksInputDto = {
  usuarioId: string;
};

export type ListarDecksOutputDto = {
  id: string;
  nome: string;
  formato: string;
  maindeck: Carta[];
  sideboard: Carta[];
  usuarioId: string;
  criadoEm: Date;
}[];

export class ListarDecks
  implements CasoDeUso<ListarDecksInputDto, ListarDecksOutputDto>
{
  private constructor(private readonly deckGateway: DeckGateway) {}

  public static criar(deckGateway: DeckGateway) {
    return new ListarDecks(deckGateway);
  }

  public async executar(
    input: ListarDecksInputDto
  ): Promise<ListarDecksOutputDto> {
    const decks = await this.deckGateway.listarPorUsuario(input.usuarioId);

    return decks.map((deck) => ({
      id: deck.id,
      nome: deck.nome,
      formato: deck.formato,
      maindeck: deck.maindeck,
      sideboard: deck.sideboard,
      usuarioId: deck.usuarioId,
      criadoEm: deck.criadoEm,
    }));
  }
}
