import { v4 as uuidv4 } from "uuid";

export type StatusTorneio = "inscricoes_abertas" | "em_andamento" | "finalizado";
export type ExibirNomeJogador = "nome" | "nickMOL" | "nickArena";
export type StoryFundoTextoRodape = "claro" | "escuro";

export interface TorneioProps {
  id: string;
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
  anfitriaoId?: string | null;
  status: StatusTorneio;
  rodadaAtual: number;
  totalRodadas: number;
  descricao?: string;
  regras?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  storyFundoUrl?: string;
  storyFundoTextoRodape?: StoryFundoTextoRodape;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  /** Última rodada do Day 1 (Swiss). Exige `vagasDay2` quando definido. */
  rodadasDay1?: number;
  /** Quantos jogadores avançam ao Day 2 após Encerrar Day 1. */
  vagasDay2?: number;
  day1Encerrado?: boolean;
  day1EncerradoEm?: Date;
  premio?: { playerPoints: number; tix: number };
  linkLive?: string;
  emCorte?: boolean;
  secreto?: boolean;
  /** Quando true, listas ficam visíveis nos standings como em torneio finalizado. */
  listasPublicas?: boolean;
  exibirNomeJogador?: ExibirNomeJogador;
  visualizacoes?: number;
  criadoEm?: Date;
  rodadaIniciadaEm?: Date;
  rodadaPublicada?: boolean;
  version?: number;
}

export class Torneio {
  public id: string;
  public nome: string;
  public horario: Date;
  public formato: string;
  public donoId: string;
  public anfitriaoId?: string | null;
  public status: StatusTorneio;
  public rodadaAtual: number;
  public totalRodadas: number;
  public descricao?: string;
  public regras?: string;
  public bannerUrl?: string;
  public linkBanner?: string;
  public somRodada?: string;
  public storyFundoUrl?: string;
  public storyFundoTextoRodape: StoryFundoTextoRodape;
  public maxJogadores?: number;
  public maxRodadas?: number;
  public corteTop?: number;
  public rodadasDay1?: number;
  public vagasDay2?: number;
  public day1Encerrado: boolean = false;
  public day1EncerradoEm?: Date;
  public premio?: { playerPoints: number; tix: number };
  public linkLive?: string;
  public emCorte: boolean = false;
  public secreto: boolean = false;
  public listasPublicas: boolean = false;
  public exibirNomeJogador: ExibirNomeJogador;
  public visualizacoes: number;
  public criadoEm: Date;
  public rodadaIniciadaEm?: Date;
  public rodadaPublicada: boolean;
  public version: number;

  constructor(props: TorneioProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.horario = props.horario;
    this.formato = props.formato;
    this.donoId = props.donoId;
    this.anfitriaoId = props.anfitriaoId ?? null;
    this.status = props.status;
    this.rodadaAtual = props.rodadaAtual;
    this.totalRodadas = props.totalRodadas;
    this.descricao = props.descricao;
    this.regras = props.regras;
    this.bannerUrl = props.bannerUrl;
    this.linkBanner = props.linkBanner;
    this.somRodada = props.somRodada;
    this.storyFundoUrl = props.storyFundoUrl;
    this.storyFundoTextoRodape = props.storyFundoTextoRodape === "claro" ? "claro" : "escuro";
    this.maxJogadores = props.maxJogadores;
    this.maxRodadas = props.maxRodadas;
    this.corteTop = props.corteTop;
    this.rodadasDay1 = props.rodadasDay1;
    this.vagasDay2 = props.vagasDay2;
    this.day1Encerrado = props.day1Encerrado ?? false;
    this.day1EncerradoEm = props.day1EncerradoEm;
    this.premio = props.premio;
    this.linkLive = props.linkLive;
    this.emCorte = props.emCorte ?? false;
    this.secreto = props.secreto ?? false;
    this.listasPublicas = props.listasPublicas ?? false;
    this.exibirNomeJogador = props.exibirNomeJogador ?? "nome";
    this.visualizacoes = props.visualizacoes ?? 0;
    this.criadoEm = props.criadoEm || new Date();
    this.rodadaIniciadaEm = props.rodadaIniciadaEm;
    this.rodadaPublicada = props.rodadaPublicada !== false;
    this.version = props.version ?? 0;
  }

  public static criar(
    props: Omit<TorneioProps, "id" | "status" | "rodadaAtual" | "totalRodadas" | "criadoEm">
  ) {
    return new Torneio({
      id: uuidv4(),
      status: "inscricoes_abertas",
      rodadaAtual: 0,
      totalRodadas: 0,
      criadoEm: new Date(),
      ...props,
    });
  }

  // --- Máquina de estados ---

  public avancarParaEmAndamento(rodadaAtual: number, totalRodadas: number): void {
    if (this.status !== "inscricoes_abertas") {
      throw new Error(`Transição inválida: ${this.status} → em_andamento`);
    }
    this.status = "em_andamento";
    this.rodadaAtual = rodadaAtual;
    this.totalRodadas = totalRodadas;
    this.rodadaIniciadaEm = new Date();
  }

  public avancarRodada(novaRodada: number, novoTotal?: number): void {
    if (this.status !== "em_andamento") {
      throw new Error(`Transição inválida: rodada não pode avançar com status ${this.status}`);
    }
    this.rodadaAtual = novaRodada;
    if (novoTotal !== undefined) this.totalRodadas = novoTotal;
    this.rodadaIniciadaEm = new Date();
  }

  public entrarEmCorte(novaRodada: number, novoTotalRodadas: number): void {
    if (this.status !== "em_andamento") {
      throw new Error(`Transição inválida: corte requer status em_andamento`);
    }
    this.emCorte = true;
    this.rodadaAtual = novaRodada;
    this.totalRodadas = novoTotalRodadas;
  }

  public voltarRodada(rodadaAnterior: number, totalRodadas?: number, emCorte?: boolean): void {
    if (this.status !== "em_andamento") {
      throw new Error(`Transição inválida: rodada não pode voltar com status ${this.status}`);
    }
    this.rodadaAtual = rodadaAnterior;
    if (totalRodadas !== undefined) this.totalRodadas = totalRodadas;
    if (emCorte !== undefined) this.emCorte = emCorte;
    this.rodadaIniciadaEm = undefined;
    this.rodadaPublicada = true;
  }

  public finalizar(): void {
    if (this.status !== "em_andamento") {
      throw new Error(`Transição inválida: ${this.status} → finalizado`);
    }
    this.status = "finalizado";
  }

  public encerrarDay1(): void {
    if (this.status !== "em_andamento") {
      throw new Error(`Transição inválida: encerrar Day 1 requer status em_andamento`);
    }
    if (this.day1Encerrado) {
      throw new Error("Day 1 já foi encerrado.");
    }
    this.day1Encerrado = true;
    this.day1EncerradoEm = new Date();
  }

  public temDay1Day2(): boolean {
    return Number(this.rodadasDay1 || 0) > 0 && Number(this.vagasDay2 || 0) > 0;
  }
}
