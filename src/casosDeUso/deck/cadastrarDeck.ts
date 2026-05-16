import { Carta, Deck } from "../../dominio/entidade/deck";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { ChatGptGateway } from "../../dominio/gateway/chatGptGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import {
  normalizarFormatoDeck,
  normalizarListaCartas,
  validarDeckPorFormato,
} from "../../dominio/regras/formatoDeck";

const MAXIMO_DECKS_POR_USUARIO = 50;

export type CadastrarDeckInputDto = {
  nome: string;
  formato: string;
  maindeck: Carta[];
  sideboard: Carta[];
  commander?: Carta[] | null;
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
  commander: Carta[];
  usuario: { id: string; nome: string };
  criadoEm: Date;
};

export class CadastrarDeck
  implements CasoDeUso<CadastrarDeckInputDto, CadastrarDeckOutputDto> {
  private constructor(
    private readonly deckGateway: DeckGateway,
    private readonly chatGptGateway: ChatGptGateway
  ) { }

  public static criar(deckGateway: DeckGateway, chatGptGateway: ChatGptGateway) {
    return new CadastrarDeck(deckGateway, chatGptGateway);
  }

  public async executar(
    input: CadastrarDeckInputDto
  ): Promise<CadastrarDeckOutputDto> {
    const totalDecksUsuario = await this.deckGateway.listarTotal({ usuarioId: input.usuarioId });
    if (totalDecksUsuario >= MAXIMO_DECKS_POR_USUARIO) {
      throw ErroPersonalizado.criar({
        mensagem: `Limite de ${MAXIMO_DECKS_POR_USUARIO} decks por usuÃ¡rio atingido.`,
        status: StatusErro.erroParametro,
      });
    }

    const formato = normalizarFormatoDeck(input.formato);
    const maindeckNormalizado = normalizarListaCartas(input.maindeck);
    const sideboardNormalizado = normalizarListaCartas(input.sideboard ?? []);
    const commanderNormalizado = normalizarListaCartas(input.commander ?? []);

    validarDeckPorFormato({
      formato,
      maindeck: maindeckNormalizado,
      sideboard: sideboardNormalizado,
      commander: commanderNormalizado,
    });

    const nomeConsolidado = await this.chatGptGateway.obterNomeConsolidado(
      maindeckNormalizado,
      sideboardNormalizado,
      commanderNormalizado,
      formato
    );

    const deck = Deck.criar({
      nome: input.nome.trim(),
      nomeConsolidado,
      formato,
      maindeck: maindeckNormalizado,
      sideboard: sideboardNormalizado,
      commander: commanderNormalizado,
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
      commander: deck.commander,
      usuario: { id: deck.usuarioId, nome: input.usuarioNome },
      criadoEm: deck.criadoEm,
    };
  }
}
