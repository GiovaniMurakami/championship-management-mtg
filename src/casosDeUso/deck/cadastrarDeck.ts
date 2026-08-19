import { Carta, Deck } from "../../dominio/entidade/deck";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import {
  normalizarFormatoDeck,
  normalizarLinkLigaMagic,
  normalizarListaCartas,
  validarDeckPorFormato,
  validarLinkLigaMagic,
} from "../../dominio/regras/formatoDeck";

const MAXIMO_DECKS_POR_USUARIO = 50;

export type CadastrarDeckInputDto = {
  nome: string;
  formato: string;
  linkLigaMagic?: string | null;
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
  linkLigaMagic: string | null;
  maindeck: Carta[];
  sideboard: Carta[];
  commander: Carta[];
  usuario: { id: string; nome: string };
  criadoEm: Date;
};

export class CadastrarDeck
  implements CasoDeUso<CadastrarDeckInputDto, CadastrarDeckOutputDto> {
  private constructor(private readonly deckGateway: DeckGateway) { }

  public static criar(deckGateway: DeckGateway) {
    return new CadastrarDeck(deckGateway);
  }

  public async executar(
    input: CadastrarDeckInputDto
  ): Promise<CadastrarDeckOutputDto> {
    const totalDecksUsuario = await this.deckGateway.listarTotal({ usuarioId: input.usuarioId });
    if (totalDecksUsuario >= MAXIMO_DECKS_POR_USUARIO) {
      throw ErroPersonalizado.criar({
        mensagem: `Limite de ${MAXIMO_DECKS_POR_USUARIO} decks por usuário atingido.`,
        status: StatusErro.erroParametro,
      });
    }

    const nome = input.nome.trim();
    const formato = normalizarFormatoDeck(input.formato);
    const linkLigaMagic = normalizarLinkLigaMagic(input.linkLigaMagic);
    const maindeckNormalizado = normalizarListaCartas(input.maindeck);
    const sideboardNormalizado = normalizarListaCartas(input.sideboard ?? []);
    const commanderNormalizado = normalizarListaCartas(input.commander ?? []);

    validarLinkLigaMagic(formato, linkLigaMagic);
    validarDeckPorFormato({
      formato,
      maindeck: maindeckNormalizado,
      sideboard: sideboardNormalizado,
      commander: commanderNormalizado,
    });

    const deck = Deck.criar({
      nome,
      nomeConsolidado: nome,
      formato,
      linkLigaMagic,
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
      linkLigaMagic: deck.linkLigaMagic,
      maindeck: deck.maindeck,
      sideboard: deck.sideboard,
      commander: deck.commander,
      usuario: { id: deck.usuarioId, nome: input.usuarioNome },
      criadoEm: deck.criadoEm,
    };
  }
}
