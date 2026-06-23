import { Carta } from "../../dominio/entidade/deck";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { CasoDeUso } from "../casoDeUso";

export type BuscarDeckInputDto = {
  id: string;
  usuarioId?: string;
};

export type BuscarDeckOutputDto = {
  id: string;
  nome: string;
  formato: string;
  linkLigaMagic: string | null;
  maindeck: Carta[];
  sideboard: Carta[];
  commander: Carta[];
  usuario: { id: string; nome: string };
  visualizacoes: number;
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

    if (deck.oculto && deck.usuarioId !== input.usuarioId) {
      throw ErroPersonalizado.criar({
        mensagem: "Deck não encontrado",
        status: 404,
      });
    }

    const deckAtual = await this.deckGateway.incrementarVisualizacoes(input.id) ?? deck;
    const usuarios = await this.usuarioGateway.buscarVarios([deckAtual.usuarioId]);
    const usuario = usuarios[0];

    return {
      id: deckAtual.id,
      nome: deckAtual.nome,
      formato: deckAtual.formato,
      linkLigaMagic: deckAtual.linkLigaMagic,
      maindeck: deckAtual.maindeck,
      sideboard: deckAtual.sideboard,
      commander: deckAtual.commander,
      usuario: {
        id: deckAtual.usuarioId,
        nome: usuario?.nome ?? deckAtual.usuarioId,
      },
      visualizacoes: deckAtual.visualizacoes,
      criadoEm: deckAtual.criadoEm,
    };
  }
}
