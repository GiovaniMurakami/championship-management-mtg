import { Carta } from "../../dominio/entidade/deck";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

const MINIMO_MAINDECK = 60;
const MAXIMO_SIDEBOARD = 15;

function totalCartas(cartas: Carta[]): number {
  return cartas.reduce((acc, carta) => acc + carta.quantidade, 0);
}

export type AtualizarDeckInputDto = {
  id: string;
  usuarioIdRequisitante: string;
  isAdmin: boolean;
  usuarioNome: string;
  nome?: string;
  nomeConsolidado?: string | null;
  formato?: string;
  maindeck?: Carta[];
  sideboard?: Carta[];
};

export type AtualizarDeckOutputDto = {
  id: string;
  nome: string;
  nomeConsolidado: string | null;
  formato: string;
  maindeck: Carta[];
  sideboard: Carta[];
  usuario: { id: string; nome: string };
  criadoEm: Date;
};

export class AtualizarDeck
  implements CasoDeUso<AtualizarDeckInputDto, AtualizarDeckOutputDto> {
  private constructor(private readonly deckGateway: DeckGateway) { }

  public static criar(deckGateway: DeckGateway) {
    return new AtualizarDeck(deckGateway);
  }

  public async executar(
    input: AtualizarDeckInputDto
  ): Promise<AtualizarDeckOutputDto> {
    const deck = await this.deckGateway.buscarPorId(input.id);

    if (!deck || (deck.usuarioId !== input.usuarioIdRequisitante && !input.isAdmin)) {
      throw ErroPersonalizado.criar({
        mensagem: "Deck não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (input.nome !== undefined) deck.nome = input.nome.trim();
    if (input.nomeConsolidado !== undefined) deck.nomeConsolidado = input.nomeConsolidado;
    if (input.formato !== undefined) deck.formato = input.formato.toLowerCase().trim();
    if (input.maindeck !== undefined) {
      deck.maindeck = input.maindeck.map((carta) => ({
        nome: carta.nome.toLowerCase().trim(),
        quantidade: carta.quantidade,
      }));
    }
    if (input.sideboard !== undefined) {
      deck.sideboard = input.sideboard.map((carta) => ({
        nome: carta.nome.toLowerCase().trim(),
        quantidade: carta.quantidade,
      }));
    }

    const totalMaindeck = totalCartas(deck.maindeck);
    if (totalMaindeck < MINIMO_MAINDECK) {
      throw ErroPersonalizado.criar({
        mensagem: `O maindeck precisa ter no mínimo ${MINIMO_MAINDECK} cartas. Atual: ${totalMaindeck}.`,
        status: StatusErro.erroParametro,
      });
    }

    const totalSideboard = totalCartas(deck.sideboard);
    if (totalSideboard > MAXIMO_SIDEBOARD) {
      throw ErroPersonalizado.criar({
        mensagem: `O sideboard pode ter no máximo ${MAXIMO_SIDEBOARD} cartas. Atual: ${totalSideboard}.`,
        status: StatusErro.erroParametro,
      });
    }

    await this.deckGateway.atualizar(deck);

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
