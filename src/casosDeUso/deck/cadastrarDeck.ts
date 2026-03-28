import { Carta, Deck } from "../../dominio/entidade/deck";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { ChatGptGateway } from "../../dominio/gateway/chatGptGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

const MINIMO_MAINDECK = 60;
const MAXIMO_SIDEBOARD = 15;

function totalCartas(cartas: Carta[]): number {
  return cartas.reduce((acc, carta) => acc + carta.quantidade, 0);
}

export type CadastrarDeckInputDto = {
  nome: string;
  formato: string;
  maindeck: Carta[];
  sideboard: Carta[];
  usuarioId: string;
  usuarioNome: string;
};

export type CadastrarDeckOutputDto = {
  id: string;
  nome: string;
  nomeConsolidado: string | null;
  formato: string;
  maindeck: Carta[];
  sideboard: Carta[];
  usuario: { id: string; nome: string };
  criadoEm: Date;
};

export class CadastrarDeck
  implements CasoDeUso<CadastrarDeckInputDto, CadastrarDeckOutputDto> {
  private constructor(
    private readonly deckGateway: DeckGateway,
    private readonly chatGptGateway: ChatGptGateway
  ) {}

  public static criar(deckGateway: DeckGateway, chatGptGateway: ChatGptGateway) {
    return new CadastrarDeck(deckGateway, chatGptGateway);
  }

  public async executar(
    input: CadastrarDeckInputDto
  ): Promise<CadastrarDeckOutputDto> {
    const totalMaindeck = totalCartas(input.maindeck);
    if (totalMaindeck < MINIMO_MAINDECK) {
      throw ErroPersonalizado.criar({
        mensagem: `O maindeck precisa ter no mínimo ${MINIMO_MAINDECK} cartas. Atual: ${totalMaindeck}.`,
        status: StatusErro.erroParametro,
      });
    }

    const totalSideboard = totalCartas(input.sideboard ?? []);
    if (totalSideboard > MAXIMO_SIDEBOARD) {
      throw ErroPersonalizado.criar({
        mensagem: `O sideboard pode ter no máximo ${MAXIMO_SIDEBOARD} cartas. Atual: ${totalSideboard}.`,
        status: StatusErro.erroParametro,
      });
    }

    const maindeckNormalizado = input.maindeck.map((carta) => ({
      nome: carta.nome.toLowerCase().trim(),
      quantidade: carta.quantidade,
    }));

    const sideboardNormalizado = input.sideboard.map((carta) => ({
      nome: carta.nome.toLowerCase().trim(),
      quantidade: carta.quantidade,
    }));

    const formato = input.formato.toLowerCase().trim();

    const nomeConsolidado = await this.chatGptGateway.obterNomeConsolidado(
      maindeckNormalizado,
      sideboardNormalizado,
      formato
    );

    const deck = Deck.criar({
      nome: input.nome.trim(),
      nomeConsolidado,
      formato,
      maindeck: maindeckNormalizado,
      sideboard: sideboardNormalizado,
      usuarioId: input.usuarioId,
    });

    await this.deckGateway.salvar(deck);

    return {
      id: deck.id,
      nome: deck.nome,
      nomeConsolidado: deck.nomeConsolidado,
      formato: deck.formato,
      maindeck: deck.maindeck,
      sideboard: deck.sideboard,
      usuario: { id: deck.usuarioId, nome: input.usuarioNome },
      criadoEm: deck.criadoEm,
    };
  }
}
