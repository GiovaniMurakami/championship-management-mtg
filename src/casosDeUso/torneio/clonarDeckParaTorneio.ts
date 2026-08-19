import { Deck } from "../../dominio/entidade/deck";

export function clonarDeckParaTorneio(deck: Deck, torneioId: string): Deck {
  return Deck.criar({
    nome: deck.nome,
    nomeConsolidado: deck.nomeConsolidado,
    cartaRepresentativa: deck.cartaRepresentativa,
    formato: deck.formato,
    linkLigaMagic: deck.linkLigaMagic,
    maindeck: deck.maindeck.map((carta) => ({ ...carta })),
    sideboard: deck.sideboard.map((carta) => ({ ...carta })),
    commander: deck.commander.map((carta) => ({ ...carta })),
    usuarioId: deck.usuarioId,
    oculto: true,
    travado: true,
    torneioId,
    deckOriginalId: deck.id,
  });
}
