import { Carta, Deck } from "../../dominio/entidade/deck";
import { DeckGateway, FiltrosListarDecks } from "../../dominio/gateway/deckGateway";
import { CasoDeUso } from "../casoDeUso";

export type ListarDecksInputDto = {
  usuarioId?: string;
  formato?: string;
  criadoApos?: string; // ISO string
  criadoAntes?: string; // ISO string
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
    const filtros: FiltrosListarDecks = {};
    if (input.usuarioId) filtros.usuarioId = input.usuarioId;
    if (input.formato) filtros.formato = input.formato;
    if (input.criadoApos) filtros.criadoApos = new Date(input.criadoApos);
    if (input.criadoAntes) filtros.criadoAntes = new Date(input.criadoAntes);

    const decks = await this.deckGateway.listar(filtros);

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
