import { Carta, Deck } from "../../dominio/entidade/deck";
import { DeckGateway, FiltrosListarDecks } from "../../dominio/gateway/deckGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
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
  usuario: { id: string; nome: string };
  criadoEm: Date;
}[];

export class ListarDecks
  implements CasoDeUso<ListarDecksInputDto, ListarDecksOutputDto> {
  private constructor(
    private readonly deckGateway: DeckGateway,
    private readonly usuarioGateway: UsuarioGateway
  ) { }

  public static criar(deckGateway: DeckGateway, usuarioGateway: UsuarioGateway) {
    return new ListarDecks(deckGateway, usuarioGateway);
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

    const usuarioIds = [...new Set(decks.map((d) => d.usuarioId))];
    const usuarios = usuarioIds.length > 0
      ? await this.usuarioGateway.buscarVarios(usuarioIds)
      : [];
    const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));

    return decks.map((deck) => ({
      id: deck.id,
      nome: deck.nome,
      formato: deck.formato,
      maindeck: deck.maindeck,
      sideboard: deck.sideboard,
      usuario: {
        id: deck.usuarioId,
        nome: usuarioMap.get(deck.usuarioId)?.nome ?? deck.usuarioId,
      },
      criadoEm: deck.criadoEm,
    }));
  }
}
