import { Carta, Deck } from "../../dominio/entidade/deck";
import { DeckGateway, FiltrosListarDecks } from "../../dominio/gateway/deckGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";

const LIMITE_MAXIMO_DECKS = 100;
const LIMITE_PADRAO_DECKS = 20;

export type ListarDecksInputDto = {
  usuarioId?: string;
  formato?: string;
  criadoApos?: string; // ISO string
  criadoAntes?: string; // ISO string
  limite?: number;
  offset?: number;
};

export type ListarDecksOutputDto = {
  decks: {
    id: string;
    nome: string;
    formato: string;
    maindeck: Carta[];
    sideboard: Carta[];
    usuario: { id: string; nome: string };
    criadoEm: Date;
  }[];
  total: number;
  limite: number;
  offset: number;
};

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
    const limite = Math.min(input.limite ?? LIMITE_PADRAO_DECKS, LIMITE_MAXIMO_DECKS);
    const offset = Math.max(input.offset ?? 0, 0);

    const filtros: FiltrosListarDecks = { limite, offset };
    if (input.usuarioId) filtros.usuarioId = input.usuarioId;
    if (input.formato) filtros.formato = input.formato;
    if (input.criadoApos) filtros.criadoApos = new Date(input.criadoApos);
    if (input.criadoAntes) filtros.criadoAntes = new Date(input.criadoAntes);

    const [decks, total] = await Promise.all([
      this.deckGateway.listar(filtros),
      this.deckGateway.listarTotal({ usuarioId: filtros.usuarioId, formato: filtros.formato }),
    ]);

    const usuarioIds = [...new Set(decks.map((d) => d.usuarioId))];
    const usuarios = usuarioIds.length > 0
      ? await this.usuarioGateway.buscarVarios(usuarioIds)
      : [];
    const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));

    return {
      decks: decks.map((deck) => ({
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
      })),
      total,
      limite,
      offset,
    };
  }
}
