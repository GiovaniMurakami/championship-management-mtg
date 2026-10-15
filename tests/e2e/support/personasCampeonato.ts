/**
 * Personas e roteiro determinístico do E2E de campeonato multi-dia.
 *
 * Fonte de verdade do “quem faz o quê” em cada rodada. O teste força
 * pareamentos via PUT /torneio/:id/rodada/:r/pareamentos para que vitória,
 * empate, contestação e corte Day 1 sejam previsíveis.
 */

export type PapelPersona =
  | "organizador"
  | "campea"
  | "vice"
  | "empatadora"
  | "contestador"
  | "corte_day1";

export type TipoResultadoRoteiro =
  | "vitoria_j1"
  | "vitoria_j2"
  | "empate"
  | "contestar_ajustar";

export type PersonaDef = {
  /** Chave estável usada no roteiro e nas asserções. */
  chave: string;
  nome: string;
  nickMTGO: string;
  papel: PapelPersona;
  /** Esperado avançar ao Day 2 após Encerrar Day 1. */
  avancaDay2: boolean;
  descricao: string;
};

export type PareamentoRoteiro = {
  mesa: number;
  j1: string;
  j2: string;
  resultado: TipoResultadoRoteiro;
  /**
   * Quando `resultado === "contestar_ajustar"`:
   * - placar inicial (errado) reportado pelo jogador `reporter`
   * - contestação pelo outro
   * - ajuste admin para o placar final
   */
  contestar?: {
    reporter: "j1" | "j2";
    placarErrado: { vitoriasJogador1: number; vitoriasJogador2: number };
    placarFinal: { vitoriasJogador1: number; vitoriasJogador2: number };
    observacao: string;
  };
  placar?: { vitoriasJogador1: number; vitoriasJogador2: number };
  /** Quem confirma após o placar (além do fluxo de contestação). */
  confirmar?: "ambos" | "nenhum";
};

export type RodadaRoteiro = {
  rodada: number;
  fase: "day1" | "day2";
  pareamentos: PareamentoRoteiro[];
};

/** Organizador (admin) — não joga. */
export const PERSONA_ORG: PersonaDef = {
  chave: "org",
  nome: "Org MultiDia E2E",
  nickMTGO: "org_multidia",
  papel: "organizador",
  avancaDay2: false,
  descricao: "Cria o torneio, força pareamentos, ajusta contestação e encerra Day 1 / torneio.",
};

/** Elenco de 8 jogadores — 4 avançam, 4 são cortados no Day 1. */
export const PERSONAS_JOGADORES: PersonaDef[] = [
  {
    chave: "ana_campea",
    nome: "Ana Campeã",
    nickMTGO: "ana_campea",
    papel: "campea",
    avancaDay2: true,
    descricao: "Favorita: vence o Day 1 e o Day 2; confirma resultados.",
  },
  {
    chave: "bruno_vice",
    nome: "Bruno Vice",
    nickMTGO: "bruno_vice",
    papel: "vice",
    avancaDay2: true,
    descricao: "Avança ao Day 2; perde a final para Ana; confirma.",
  },
  {
    chave: "carla_empate",
    nome: "Carla Empate",
    nickMTGO: "carla_empate",
    papel: "empatadora",
    avancaDay2: true,
    descricao: "Avança ao Day 2; empata na rodada 3; perde a rodada 4.",
  },
  {
    chave: "diego_contesta",
    nome: "Diego Contesta",
    nickMTGO: "diego_contesta",
    papel: "contestador",
    avancaDay2: true,
    descricao: "Avança ao Day 2; na R3 reporta placar errado e a adversária contesta.",
  },
  {
    chave: "elena_corte",
    nome: "Elena Corte",
    nickMTGO: "elena_corte",
    papel: "corte_day1",
    avancaDay2: false,
    descricao: "Perde o Day 1 e é dropada no corte (vagasDay2).",
  },
  {
    chave: "fabio_corte",
    nome: "Fábio Corte",
    nickMTGO: "fabio_corte",
    papel: "corte_day1",
    avancaDay2: false,
    descricao: "Perde o Day 1 e é cortado.",
  },
  {
    chave: "gabi_corte",
    nome: "Gabi Corte",
    nickMTGO: "gabi_corte",
    papel: "corte_day1",
    avancaDay2: false,
    descricao: "Perde o Day 1 e é cortada.",
  },
  {
    chave: "hugo_corte",
    nome: "Hugo Corte",
    nickMTGO: "hugo_corte",
    papel: "corte_day1",
    avancaDay2: false,
    descricao: "Perde o Day 1 e é cortado.",
  },
];

export const CHAVES_DAY2 = PERSONAS_JOGADORES.filter((p) => p.avancaDay2).map((p) => p.chave);
export const CHAVES_CORTE = PERSONAS_JOGADORES.filter((p) => !p.avancaDay2).map((p) => p.chave);

/**
 * Configuração do torneio multi-dia neste E2E.
 * Swiss: ceil(log2(8))=3, mas maxRodadas=4 → R1–R2 Day1, R3–R4 Day2.
 */
export const CONFIG_TORNEIO_MULTIDIA = {
  formato: "Standard",
  maxJogadores: 8,
  maxRodadas: 4,
  rodadasDay1: 2,
  vagasDay2: 4,
  exibirNomeJogador: "nickMOL" as const,
};

/**
 * Roteiro completo — pareamentos e resultados por rodada.
 *
 * Day 1: cada favorito enfrenta um “corte” duas vezes → favoritos 6 pts, cortes 0.
 * Day 2: empate (Carla×Bruno), contestação (Diego×Ana) e final Ana×Bruno.
 */
export const ROTEIRO_RODADAS: RodadaRoteiro[] = [
  {
    rodada: 1,
    fase: "day1",
    pareamentos: [
      {
        mesa: 1,
        j1: "ana_campea",
        j2: "hugo_corte",
        resultado: "vitoria_j1",
        placar: { vitoriasJogador1: 2, vitoriasJogador2: 0 },
        confirmar: "ambos",
      },
      {
        mesa: 2,
        j1: "bruno_vice",
        j2: "gabi_corte",
        resultado: "vitoria_j1",
        placar: { vitoriasJogador1: 2, vitoriasJogador2: 1 },
        confirmar: "ambos",
      },
      {
        mesa: 3,
        j1: "carla_empate",
        j2: "fabio_corte",
        resultado: "vitoria_j1",
        placar: { vitoriasJogador1: 2, vitoriasJogador2: 0 },
        confirmar: "ambos",
      },
      {
        mesa: 4,
        j1: "diego_contesta",
        j2: "elena_corte",
        resultado: "vitoria_j1",
        placar: { vitoriasJogador1: 2, vitoriasJogador2: 0 },
        confirmar: "ambos",
      },
    ],
  },
  {
    rodada: 2,
    fase: "day1",
    pareamentos: [
      {
        mesa: 1,
        j1: "ana_campea",
        j2: "elena_corte",
        resultado: "vitoria_j1",
        placar: { vitoriasJogador1: 2, vitoriasJogador2: 0 },
        confirmar: "ambos",
      },
      {
        mesa: 2,
        j1: "bruno_vice",
        j2: "fabio_corte",
        resultado: "vitoria_j1",
        placar: { vitoriasJogador1: 2, vitoriasJogador2: 0 },
        confirmar: "ambos",
      },
      {
        mesa: 3,
        j1: "carla_empate",
        j2: "gabi_corte",
        resultado: "vitoria_j1",
        placar: { vitoriasJogador1: 2, vitoriasJogador2: 0 },
        confirmar: "ambos",
      },
      {
        mesa: 4,
        j1: "diego_contesta",
        j2: "hugo_corte",
        resultado: "vitoria_j1",
        placar: { vitoriasJogador1: 2, vitoriasJogador2: 0 },
        confirmar: "ambos",
      },
    ],
  },
  {
    rodada: 3,
    fase: "day2",
    pareamentos: [
      {
        mesa: 1,
        j1: "diego_contesta",
        j2: "ana_campea",
        resultado: "contestar_ajustar",
        contestar: {
          reporter: "j1",
          // Diego reporta 2-0 a favor dele (errado)
          placarErrado: { vitoriasJogador1: 2, vitoriasJogador2: 0 },
          // Admin ajusta: Ana venceu 2-1
          placarFinal: { vitoriasJogador1: 1, vitoriasJogador2: 2 },
          observacao: "Diego reportou placar invertido — Ana venceu 2-1",
        },
        confirmar: "nenhum",
      },
      {
        mesa: 2,
        j1: "bruno_vice",
        j2: "carla_empate",
        resultado: "empate",
        placar: { vitoriasJogador1: 1, vitoriasJogador2: 1 },
        confirmar: "ambos",
      },
    ],
  },
  {
    rodada: 4,
    fase: "day2",
    pareamentos: [
      {
        mesa: 1,
        j1: "ana_campea",
        j2: "bruno_vice",
        resultado: "vitoria_j1",
        placar: { vitoriasJogador1: 2, vitoriasJogador2: 1 },
        confirmar: "ambos",
      },
      {
        mesa: 2,
        j1: "diego_contesta",
        j2: "carla_empate",
        resultado: "vitoria_j1",
        placar: { vitoriasJogador1: 2, vitoriasJogador2: 0 },
        confirmar: "ambos",
      },
    ],
  },
];

/** Pontos de mesa esperados após cada fase (Swiss: W=3, E=1, L=0). */
export const PONTOS_ESPERADOS = {
  aposDay1: {
    ana_campea: 6,
    bruno_vice: 6,
    carla_empate: 6,
    diego_contesta: 6,
    elena_corte: 0,
    fabio_corte: 0,
    gabi_corte: 0,
    hugo_corte: 0,
  },
  aposDay2: {
    // R3: Ana +3 (após ajuste), Bruno+Carla +1, Diego 0
    // R4: Ana +3, Bruno 0, Diego +3, Carla 0
    // Total Day1(6) + Day2:
    ana_campea: 12, // 6 + 3 + 3
    bruno_vice: 7, // 6 + 1 + 0
    diego_contesta: 9, // 6 + 0 + 3
    carla_empate: 7, // 6 + 1 + 0
  },
} as const;

export function placarDoPareamento(
  roteiro: PareamentoRoteiro
): { vitoriasJogador1: number; vitoriasJogador2: number } {
  if (roteiro.resultado === "contestar_ajustar") {
    if (!roteiro.contestar) {
      throw new Error(`Roteiro mesa ${roteiro.mesa} sem bloco contestar`);
    }
    return roteiro.contestar.placarFinal;
  }
  if (roteiro.placar) return roteiro.placar;
  if (roteiro.resultado === "empate") return { vitoriasJogador1: 1, vitoriasJogador2: 1 };
  if (roteiro.resultado === "vitoria_j1") return { vitoriasJogador1: 2, vitoriasJogador2: 0 };
  if (roteiro.resultado === "vitoria_j2") return { vitoriasJogador1: 0, vitoriasJogador2: 2 };
  throw new Error(`Placar indefinido para mesa ${roteiro.mesa}`);
}
