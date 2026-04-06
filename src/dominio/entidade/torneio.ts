import { v4 as uuidv4 } from "uuid";

export type StatusTorneio = "inscricoes_abertas" | "em_andamento" | "finalizado";

export interface TorneioProps {
  id: string;
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
  status: StatusTorneio;
  rodadaAtual: number;
  totalRodadas: number;
  premio?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  linkLive?: string;
  emCorte?: boolean;
  secreto?: boolean;
  criadoEm?: Date;
  rodadaIniciadaEm?: Date;
}

export class Torneio {
  public id: string;
  public nome: string;
  public horario: Date;
  public formato: string;
  public donoId: string;
  public status: StatusTorneio;
  public rodadaAtual: number;
  public totalRodadas: number;
  public premio?: string;
  public bannerUrl?: string;
  public linkBanner?: string;
  public somRodada?: string;
  public maxJogadores?: number;
  public maxRodadas?: number;
  public corteTop?: number;
  public linkLive?: string;
  public emCorte: boolean = false;
  public secreto: boolean = false;
  public criadoEm: Date;
  public rodadaIniciadaEm?: Date;

  constructor(props: TorneioProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.horario = props.horario;
    this.formato = props.formato;
    this.donoId = props.donoId;
    this.status = props.status;
    this.rodadaAtual = props.rodadaAtual;
    this.totalRodadas = props.totalRodadas;
    this.premio = props.premio;
    this.bannerUrl = props.bannerUrl;
    this.linkBanner = props.linkBanner;
    this.somRodada = props.somRodada;
    this.maxJogadores = props.maxJogadores;
    this.maxRodadas = props.maxRodadas;
    this.corteTop = props.corteTop;
    this.linkLive = props.linkLive;
    this.emCorte = props.emCorte ?? false;
    this.secreto = props.secreto ?? false;
    this.criadoEm = props.criadoEm || new Date();
    this.rodadaIniciadaEm = props.rodadaIniciadaEm;
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

  public finalizar(): void {
    if (this.status !== "em_andamento") {
      throw new Error(`Transição inválida: ${this.status} → finalizado`);
    }
    this.status = "finalizado";
  }
}
