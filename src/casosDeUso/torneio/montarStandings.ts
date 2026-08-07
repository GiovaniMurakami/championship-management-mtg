import { Deck } from "../../dominio/entidade/deck";
import { Inscricao } from "../../dominio/entidade/inscricao";
import { Partida } from "../../dominio/entidade/partida";
import { StandingJogador } from "../../dominio/entidade/standings";
import { Time } from "../../dominio/entidade/time";
import { ExibirNomeJogador, Torneio } from "../../dominio/entidade/torneio";
import { Usuario } from "../../dominio/entidade/usuario";
import {
  calcularEstatisticas,
  ordenarPorDesempate,
  mwp,
  omwp,
  gwp,
  ogwp,
} from "./swiss";

function resolverNome(u: Usuario, modo: ExibirNomeJogador): string {
  if (modo === "nickMOL") return u.nickMTGO ?? u.nome;
  if (modo === "nickArena") return u.nickArena ?? u.nome;
  return u.nome;
}

export function obterPrimeiraRodadaCorte(
  corteTop?: number,
  totalRodadas?: number
): number | null {
  const corte = Number(corteTop || 0);
  const total = Number(totalRodadas || 0);
  const rodadasCorte = Math.log2(corte);
  if (!Number.isInteger(rodadasCorte) || rodadasCorte <= 0 || total <= 0) return null;
  return total - rodadasCorte + 1;
}

export type MontarStandingsInput = {
  torneio: Torneio;
  inscricoes: Inscricao[];
  partidas: Partida[];
  usuarios: Usuario[];
  decks: Deck[];
  times: Time[];
  /**
   * Rodada consolidada do snapshot.
   * - 0: zeros (pré-resultados / inscrição / início)
   * - N: inclui partidas com rodada <= N (ou < primeiraRodadaCorte se em corte)
   * - Se `incluirAteRodada` omitido e status finalizado: todas elegíveis
   */
  incluirAteRodada?: number;
  /** Se true, usa comportamento legado de GET em andamento (rodada < rodadaAtual). */
  modoLegadoRodadaAtual?: boolean;
};

function montarTimeByMembro(times: Time[]): Map<string, Time> {
  const timeByMembro = new Map<string, Time>();
  for (const t of times) {
    for (const membroId of t.membroIds) {
      if (!timeByMembro.has(membroId)) timeByMembro.set(membroId, t);
    }
  }
  return timeByMembro;
}

function linhaZerada(
  inscricao: Inscricao,
  idx: number,
  usuarioMap: Map<string, Usuario>,
  deckMap: Map<string, Deck>,
  timeByMembro: Map<string, Time>,
  modoNome: ExibirNomeJogador
): StandingJogador {
  const u = usuarioMap.get(inscricao.usuarioId);
  const t = timeByMembro.get(inscricao.usuarioId);
  return {
    posicao: idx + 1,
    usuario: {
      id: inscricao.usuarioId,
      nome: u ? resolverNome(u, modoNome) : inscricao.usuarioId,
      resultadosExpressivos: u?.resultadosExpressivos ?? 0,
    },
    time: t ? { id: t.id, nome: t.nome, imagemUrl: t.imagemUrl } : null,
    pontosMesa: 0,
    vitoriasPartida: 0,
    empatesPartida: 0,
    derrotasPartida: 0,
    mwp: 0,
    omwp: 0,
    gwp: 0,
    ogwp: 0,
    checkInRodada: inscricao.checkInRodada,
    deckId: inscricao.deckId ?? null,
    deckNome: inscricao.deckId
      ? deckMap.get(inscricao.deckId)?.nomeConsolidado ||
        deckMap.get(inscricao.deckId)?.nome ||
        null
      : null,
    dropped: inscricao.dropped,
    resultadosExpressivos: u?.resultadosExpressivos ?? 0,
  };
}

/**
 * Monta as linhas de standings com as mesmas regras Swiss atuais.
 * Extraído de BuscarStandings para materialização e testes.
 */
export function montarJogadoresStandings(
  input: MontarStandingsInput
): StandingJogador[] {
  const {
    torneio,
    inscricoes,
    partidas: todasPartidas,
    usuarios,
    decks,
    times,
  } = input;

  const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));
  const deckMap = new Map(decks.map((d) => [d.id, d]));
  const timeByMembro = montarTimeByMembro(times);

  const usarZeros =
    input.incluirAteRodada === 0 ||
    (input.incluirAteRodada === undefined &&
      input.modoLegadoRodadaAtual !== false &&
      (torneio.status === "inscricoes_abertas" ||
        (torneio.status !== "finalizado" && torneio.rodadaAtual <= 1)));

  if (usarZeros) {
    return inscricoes.map((i, idx) =>
      linhaZerada(i, idx, usuarioMap, deckMap, timeByMembro, torneio.exibirNomeJogador)
    );
  }

  const primeiraRodadaCorte = torneio.emCorte
    ? obterPrimeiraRodadaCorte(torneio.corteTop, torneio.totalRodadas)
    : null;

  const partidasElegiveisParaStandings = primeiraRodadaCorte
    ? todasPartidas.filter((p) => p.rodada < primeiraRodadaCorte)
    : todasPartidas;

  let partidasConsolidadas: Partida[];
  if (input.incluirAteRodada !== undefined) {
    partidasConsolidadas = partidasElegiveisParaStandings.filter(
      (p) => p.rodada <= input.incluirAteRodada!
    );
  } else if (torneio.status === "finalizado") {
    partidasConsolidadas = partidasElegiveisParaStandings;
  } else {
    partidasConsolidadas = partidasElegiveisParaStandings.filter(
      (p) => p.rodada < torneio.rodadaAtual
    );
  }

  const jogadoresComCheckIn = inscricoes
    .filter((i) => i.checkInRodada >= 0)
    .map((i) => i.usuarioId);

  const idsComHistorico = Array.from(
    new Set(
      todasPartidas.flatMap((p) => [
        p.jogador1Id,
        ...(p.jogador2Id ? [p.jogador2Id] : []),
      ])
    )
  );

  const jogadoresIds = Array.from(
    new Set([...jogadoresComCheckIn, ...idsComHistorico])
  );
  const inscricaoMap = new Map(inscricoes.map((i) => [i.usuarioId, i]));

  const statsMap = calcularEstatisticas(jogadoresIds, partidasConsolidadas);
  const ordenados = ordenarPorDesempate(Array.from(statsMap.values()), statsMap);

  return ordenados.map((s, idx) => {
    const inscricao = inscricaoMap.get(s.usuarioId);
    const t = timeByMembro.get(s.usuarioId);
    const u = usuarioMap.get(s.usuarioId);
    return {
      posicao: idx + 1,
      usuario: {
        id: s.usuarioId,
        nome: u ? resolverNome(u, torneio.exibirNomeJogador) : s.usuarioId,
        resultadosExpressivos: u?.resultadosExpressivos ?? 0,
      },
      time: t ? { id: t.id, nome: t.nome, imagemUrl: t.imagemUrl } : null,
      pontosMesa: s.pontosMesa,
      vitoriasPartida: s.vitoriasPartida,
      empatesPartida: s.empatesPartida,
      derrotasPartida: s.derrotasPartida,
      mwp: mwp(s),
      omwp: omwp(s, statsMap),
      gwp: gwp(s),
      ogwp: ogwp(s, statsMap),
      checkInRodada: inscricao?.checkInRodada ?? -1,
      deckId: inscricao?.deckId ?? null,
      deckNome: inscricao?.deckId
        ? deckMap.get(inscricao.deckId)?.nomeConsolidado ||
          deckMap.get(inscricao.deckId)?.nome ||
          null
        : null,
      dropped: inscricao?.dropped ?? false,
      resultadosExpressivos: u?.resultadosExpressivos ?? 0,
    };
  });
}
