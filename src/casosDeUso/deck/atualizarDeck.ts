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

function normalizarCartaRepresentativa(valor: string | null): string | null {
  if (valor === null) return null;
  return String(valor).trim() || null;
}

function saidaDeck(deck: Deck, usuarioNome: string): AtualizarDeckOutputDto {
  return {
    id: deck.id,
    nome: deck.nome,
    nomeConsolidado: deck.nomeConsolidado,
    cartaRepresentativa: deck.cartaRepresentativa,
    formato: deck.formato,
    linkLigaMagic: deck.linkLigaMagic,
    maindeck: deck.maindeck,
    sideboard: deck.sideboard,
    commander: deck.commander,
    usuario: { id: deck.usuarioId, nome: usuarioNome },
    criadoEm: deck.criadoEm,
  };
}

export type AtualizarDeckInputDto = {
  id: string;
  usuarioIdRequisitante: string;
  isAdmin: boolean;
  usuarioNome: string;
  nome?: string;
  nomeConsolidado?: string | null;
  cartaRepresentativa?: string | null;
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
  cartaRepresentativa: string | null;
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

    if (deck.travado) {
      // Deck de torneio: cartas/formato ficam congelados; admin pode só meta (nome/carta).
      const temMeta =
        input.nomeConsolidado !== undefined || input.cartaRepresentativa !== undefined;
      if (!temMeta) {
        throw ErroPersonalizado.criar({
          mensagem: "Este deck está travado porque está vinculado a um torneio.",
          status: StatusErro.erroParametro,
        });
      }

      if (input.nomeConsolidado !== undefined) {
        deck.nomeConsolidado =
          input.nomeConsolidado === null ? null : String(input.nomeConsolidado).trim() || null;
      }
      if (input.cartaRepresentativa !== undefined) {
        deck.cartaRepresentativa = normalizarCartaRepresentativa(input.cartaRepresentativa);
      }

      await this.deckGateway.atualizar(deck);
      return saidaDeck(deck, input.usuarioNome);
    }

    if (input.nome !== undefined) {
      const novoNome = input.nome.trim();
      const consolidadoSegueNomeDoUsuario =
        !deck.nomeConsolidado || deck.nomeConsolidado === deck.nome;
      deck.nome = novoNome;
      if (input.nomeConsolidado === undefined && consolidadoSegueNomeDoUsuario) {
        deck.nomeConsolidado = novoNome;
      }
    }
    if (input.nomeConsolidado !== undefined) {
      deck.nomeConsolidado =
        input.nomeConsolidado === null ? null : String(input.nomeConsolidado).trim() || null;
    }
    if (input.cartaRepresentativa !== undefined) {
      deck.cartaRepresentativa = normalizarCartaRepresentativa(input.cartaRepresentativa);
    }
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
    return saidaDeck(deck, input.usuarioNome);
  }
}
