import { Carta } from "../../dominio/entidade/deck";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { CasoDeUso } from "../casoDeUso";

export type BuscarDeckInputDto = {
  id: string;
};

export type BuscarDeckOutputDto = {
  id: string;
  nome: string;
  formato: string;
  maindeck: Carta[];
  sideboard: Carta[];
  usuario: { id: string; nome: string };
  criadoEm: Date;
};

export class BuscarDeck
  implements CasoDeUso<BuscarDeckInputDto, BuscarDeckOutputDto> {
  private constructor(
    private readonly deckGateway: DeckGateway,
    private readonly usuarioGateway: UsuarioGateway
  ) {}

  public static criar(deckGateway: DeckGateway, usuarioGateway: UsuarioGateway) {
    return new BuscarDeck(deckGateway, usuarioGateway);
  }

  public async executar(input: BuscarDeckInputDto): Promise<BuscarDeckOutputDto> {
    const deck = await this.deckGateway.buscarPorId(input.id);

    if (!deck) {
      throw ErroPersonalizado.criar({
        mensagem: "Deck não encontrado",
        status: 404,
      });
    }

    const usuarios = await this.usuarioGateway.buscarVarios([deck.usuarioId]);
    const usuario = usuarios[0];

    return {
      id: deck.id,
      nome: deck.nome,
      formato: deck.formato,
      maindeck: deck.maindeck,
      sideboard: deck.sideboard,
      usuario: {
        id: deck.usuarioId,
        nome: usuario?.nome ?? deck.usuarioId,
      },
      criadoEm: deck.criadoEm,
    };
  }
}
