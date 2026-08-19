import { v4 as uuidv4 } from "uuid";

export interface InscricaoProps {
  id: string;
  torneioId: string;
  usuarioId: string;
  deckId?: string;
  timeId?: string;
  checkInRodada?: number;
  dropped?: boolean;
  droppedRodada?: number | null;
  dropPartidaIds?: string[];
  byeCount?: number;
  criadoEm?: Date;
}

export class Inscricao {
  public id: string;
  public torneioId: string;
  public usuarioId: string;
  public deckId?: string;
  public timeId?: string;
  public checkInRodada: number;
  public dropped: boolean;
  public droppedRodada: number | null;
  public dropPartidaIds: string[];
  public byeCount: number;
  public criadoEm: Date;

  constructor(props: InscricaoProps) {
    this.id = props.id;
    this.torneioId = props.torneioId;
    this.usuarioId = props.usuarioId;
    this.deckId = props.deckId;
    this.timeId = props.timeId;
    this.checkInRodada = props.checkInRodada ?? -1;
    this.dropped = props.dropped ?? false;
    this.droppedRodada = props.droppedRodada ?? null;
    this.dropPartidaIds = props.dropPartidaIds ?? [];
    this.byeCount = props.byeCount ?? 0;
    this.criadoEm = props.criadoEm || new Date();
  }

  public static criar(
    props: Omit<InscricaoProps, "id" | "checkInRodada" | "dropped" | "droppedRodada" | "dropPartidaIds" | "byeCount" | "criadoEm">
  ) {
    return new Inscricao({
      id: uuidv4(),
      checkInRodada: -1,
      dropped: false,
      droppedRodada: null,
      dropPartidaIds: [],
      byeCount: 0,
      criadoEm: new Date(),
      ...props,
    });
  }
}
