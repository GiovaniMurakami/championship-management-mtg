import { randomUUID } from "crypto";

export type StandingJogador = {
  posicao: number;
  usuario: { id: string; nome: string; resultadosExpressivos: number };
  time: { id: string; nome: string; imagemUrl?: string } | null;
  pontosMesa: number;
  vitoriasPartida: number;
  empatesPartida: number;
  derrotasPartida: number;
  mwp: number;
  omwp: number;
  gwp: number;
  ogwp: number;
  checkInRodada: number;
  deckId?: string | null;
  deckNome?: string | null;
  dropped: boolean;
  resultadosExpressivos: number;
};

export type StandingsProps = {
  id: string;
  torneioId: string;
  /** Rodada consolidada neste snapshot (0 = pré-rodada 1 / zeros). */
  rodada: number;
  totalInscritos: number;
  jogadores: StandingJogador[];
  criadoEm: Date;
  atualizadoEm: Date;
};

export class Standings {
  public readonly id: string;
  public readonly torneioId: string;
  public readonly rodada: number;
  public readonly totalInscritos: number;
  public readonly jogadores: StandingJogador[];
  public readonly criadoEm: Date;
  public readonly atualizadoEm: Date;

  constructor(props: StandingsProps) {
    this.id = props.id;
    this.torneioId = props.torneioId;
    this.rodada = props.rodada;
    this.totalInscritos = props.totalInscritos;
    this.jogadores = props.jogadores;
    this.criadoEm = props.criadoEm;
    this.atualizadoEm = props.atualizadoEm;
  }

  public static criar(props: {
    torneioId: string;
    rodada: number;
    totalInscritos: number;
    jogadores: StandingJogador[];
    id?: string;
  }): Standings {
    const agora = new Date();
    return new Standings({
      id: props.id ?? randomUUID(),
      torneioId: props.torneioId,
      rodada: props.rodada,
      totalInscritos: props.totalInscritos,
      jogadores: props.jogadores,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }
}
