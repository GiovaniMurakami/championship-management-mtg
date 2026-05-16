import { Carta } from "../../dominio/entidade/deck";
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

export type AtualizarDeckInputDto = {
  id: string;
  usuarioIdRequisitante: string;
  isAdmin: boolean;
  usuarioNome: string;
  nome?: string;
  nomeConsolidado?: string | null;
  formato?: string;
  linkLigaMagic?: string | null;
  maindeck?: Carta[];
  sideboard?: Carta[];
  commander?: Carta[] | null;
};

export type AtualizarDeckOutputDto = {
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
    if (input.formato !== undefined) deck.formato = normalizarFormatoDeck(input.formato);
    if (input.linkLigaMagic !== undefined) deck.linkLigaMagic = normalizarLinkLigaMagic(input.linkLigaMagic);
    if (input.maindeck !== undefined) deck.maindeck = normalizarListaCartas(input.maindeck);
    if (input.sideboard !== undefined) deck.sideboard = normalizarListaCartas(input.sideboard);
    if (input.commander !== undefined) deck.commander = normalizarListaCartas(input.commander ?? []);

    validarLinkLigaMagic(deck.formato, deck.linkLigaMagic);
    validarDeckPorFormato({
      formato: deck.formato,
      maindeck: deck.maindeck,
      sideboard: deck.sideboard,
      commander: deck.commander,
    });

    await this.deckGateway.atualizar(deck);

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
