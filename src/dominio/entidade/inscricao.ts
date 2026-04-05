import { v4 as uuidv4 } from "uuid";

export interface InscricaoProps {
  id: string;
  torneioId: string;
  usuarioId: string;
  deckId?: string;
  checkIn: boolean;
  checkInRodada: number;
  dropped: boolean;
  byeCount: number;
  criadoEm?: Date;
}

export class Inscricao {
  public id: string;
  public torneioId: string;
  public usuarioId: string;
  public deckId?: string;
  public checkIn: boolean;
  public checkInRodada: number;
  public dropped: boolean;
  public byeCount: number;
  public criadoEm: Date;

  constructor(props: InscricaoProps) {
    this.id = props.id;
    this.torneioId = props.torneioId;
    this.usuarioId = props.usuarioId;
    this.deckId = props.deckId;
    this.checkIn = props.checkIn;
    this.checkInRodada = props.checkInRodada;
    this.dropped = props.dropped;
    this.byeCount = props.byeCount ?? 0;
    this.criadoEm = props.criadoEm || new Date();
  }

  public static criar(
    props: Omit<InscricaoProps, "id" | "checkIn" | "checkInRodada" | "dropped" | "byeCount" | "criadoEm">
  ) {
    return new Inscricao({
      id: uuidv4(),
      checkIn: false,
      checkInRodada: -1,
      dropped: false,
      byeCount: 0,
      criadoEm: new Date(),
      ...props,
    });
  }
}
