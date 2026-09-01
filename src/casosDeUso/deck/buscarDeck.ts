import { Carta } from "../../dominio/entidade/deck";
import { Partida } from "../../dominio/entidade/partida";
import { DeckGateway } from "../../dominio/gateway/deckGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { logger } from "../../helpers/logger";
import { toUsuarioPublico } from "../../helpers/torneio/resolverNomeJogador";
import { CasoDeUso } from "../casoDeUso";

export type BuscarDeckInputDto = {
  id: string;
  usuarioId?: string;
  isAdmin?: boolean;
};

export type EstatisticasDeckDto = {
  vitorias: number;
  derrotas: number;
  empates: number;
  totalPartidas: number;
  winrate: number;
};

export type BuscarDeckOutputDto = {
  id: string;
  nome: string;
  formato: string;
  linkLigaMagic: string | null;
  maindeck: Carta[];
  sideboard: Carta[];
  commander: Carta[];
  usuario: { id: string; nome: string; excluido: boolean };
  visualizacoes: number;
  criadoEm: Date;
  estatisticas: EstatisticasDeckDto;
};

function calcularEstatisticasDeck(deckIds: Set<string>, partidas: Partida[]): EstatisticasDeckDto {
  let vitorias = 0;
  let derrotas = 0;
  let empates = 0;

  for (const partida of partidas) {
    if (partida.status !== "finalizada") continue;
    if (!partida.jogador2Id) continue; // ignora BYE

    const ehDeck1 = Boolean(partida.deckJogador1Id && deckIds.has(partida.deckJogador1Id));
    const ehDeck2 = Boolean(partida.deckJogador2Id && deckIds.has(partida.deckJogador2Id));
    if (!ehDeck1 && !ehDeck2) continue;
    // Mirror match do mesmo deck original: conta um resultado a favor do "lado" com vitória.
    // Se ambos os lados usam cópia do mesmo original, conta empate/vitória/derrota uma vez pelo placar.
    if (ehDeck1 && ehDeck2) {
      const v1 = partida.vitoriasJogador1;
      const v2 = partida.vitoriasJogador2;
      if (v1 === v2) empates += 1;
      else if (v1 > v2) vitorias += 1;
      else derrotas += 1;
      continue;
    }

    const vitoriasDeck = ehDeck1 ? partida.vitoriasJogador1 : partida.vitoriasJogador2;
    const vitoriasOponente = ehDeck1 ? partida.vitoriasJogador2 : partida.vitoriasJogador1;

    if (vitoriasDeck > vitoriasOponente) vitorias += 1;
    else if (vitoriasDeck < vitoriasOponente) derrotas += 1;
    else empates += 1;
  }

  const totalPartidas = vitorias + derrotas + empates;
  const winrate =
    totalPartidas > 0 ? Math.round((vitorias / totalPartidas) * 1000) / 10 : 0;

  return { vitorias, derrotas, empates, totalPartidas, winrate };
}

export class BuscarDeck
  implements CasoDeUso<BuscarDeckInputDto, BuscarDeckOutputDto> {
  private constructor(
    private readonly deckGateway: DeckGateway,
    private readonly usuarioGateway: UsuarioGateway,
    private readonly partidaGateway: PartidaGateway
  ) {}

  public static criar(
    deckGateway: DeckGateway,
    usuarioGateway: UsuarioGateway,
    partidaGateway: PartidaGateway
  ) {
    return new BuscarDeck(deckGateway, usuarioGateway, partidaGateway);
  }

  public async executar(input: BuscarDeckInputDto): Promise<BuscarDeckOutputDto> {
    const deck = await this.deckGateway.buscarPorId(input.id);

    if (!deck) {
      throw ErroPersonalizado.criar({
        mensagem: "Deck não encontrado",
        status: 404,
      });
    }

    // Cópias de torneio (travado) são visíveis no contexto do evento.
    // Demais decks ocultos: só dono ou admin.
    if (deck.oculto && !deck.travado) {
      const isOwner = deck.usuarioId === input.usuarioId;
      if (!isOwner && !input.isAdmin) {
        throw ErroPersonalizado.criar({
          mensagem: "Deck não encontrado",
          status: 404,
        });
      }
    }

    let deckAtual = deck;
    try {
      deckAtual = await this.deckGateway.incrementarVisualizacoes(input.id) ?? deck;
    } catch (error) {
      logger.warn({ err: error, deckId: input.id }, "falha ao incrementar visualizacoes do deck");
    }
    const usuarios = await this.usuarioGateway.buscarVarios([deckAtual.usuarioId]);
    const usuario = usuarios[0];

    // Estatísticas agregam partidas das cópias travadas (deckOriginalId) + o próprio deck.
    const raizId = deckAtual.deckOriginalId || deckAtual.id;
    const copias = await this.deckGateway.listarPorDeckOriginalId(raizId);
    const deckIds = new Set<string>([raizId, ...copias.map((copia) => copia.id)]);
    if (deckAtual.id !== raizId) {
      deckIds.add(deckAtual.id);
    }

    const partidas = await this.partidaGateway.listarPorDeckIds(Array.from(deckIds));
    const estatisticas = calcularEstatisticasDeck(deckIds, partidas);

    return {
      id: deckAtual.id,
      nome: deckAtual.nome,
      formato: deckAtual.formato,
      linkLigaMagic: deckAtual.linkLigaMagic,
      maindeck: deckAtual.maindeck,
      sideboard: deckAtual.sideboard,
      commander: deckAtual.commander,
      usuario: toUsuarioPublico(usuario, deckAtual.usuarioId),
      visualizacoes: deckAtual.visualizacoes,
      criadoEm: deckAtual.criadoEm,
      estatisticas,
    };
  }
}
