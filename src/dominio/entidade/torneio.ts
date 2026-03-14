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
  criadoEm?: Date;
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
  public criadoEm: Date;

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
    this.criadoEm = props.criadoEm || new Date();
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
}
