import { v4 as uuidv4 } from "uuid";

export type StatusPartida = "pendente" | "finalizada";
export type TipoBye = "normal" | "penalidade" | null;

export interface PartidaProps {
  id: string;
  torneioId: string;
  rodada: number;
  jogador1Id: string;
  jogador2Id: string | null; // null = bye
  deckJogador1Id?: string;
  deckJogador2Id?: string | null;
  vitoriasJogador1: number;
  vitoriasJogador2: number;
  status: StatusPartida;
  contestado?: boolean;
  tipoBye?: TipoBye;
  confirmadoPor?: string[];
  mesa?: number | null;
  criadoEm?: Date;
}

export class Partida {
  public id: string;
  public torneioId: string;
  public rodada: number;
  public jogador1Id: string;
  public jogador2Id: string | null;
  public deckJogador1Id?: string;
  public deckJogador2Id?: string | null;
  public vitoriasJogador1: number;
  public vitoriasJogador2: number;
  public status: StatusPartida;
  public contestado: boolean;
  public tipoBye: TipoBye;
  public confirmadoPor: string[];
  public mesa: number | null;
  public criadoEm: Date;

  constructor(props: PartidaProps) {
    this.id = props.id;
    this.torneioId = props.torneioId;
    this.rodada = props.rodada;
    this.jogador1Id = props.jogador1Id;
    this.jogador2Id = props.jogador2Id;
    this.deckJogador1Id = props.deckJogador1Id;
    this.deckJogador2Id = props.deckJogador2Id;
    this.vitoriasJogador1 = props.vitoriasJogador1;
    this.vitoriasJogador2 = props.vitoriasJogador2;
    this.status = props.status;
    this.contestado = props.contestado ?? false;
    this.tipoBye = props.tipoBye ?? null;
    this.confirmadoPor = props.confirmadoPor ?? [];
    this.mesa = props.mesa ?? null;
    this.criadoEm = props.criadoEm || new Date();
  }

  public static criar(
    props: Omit<
      PartidaProps,
      "id" | "vitoriasJogador1" | "vitoriasJogador2" | "status" | "criadoEm" | "tipoBye"
    >
  ) {
    const isBye = props.jogador2Id === null;
    return new Partida({
      id: uuidv4(),
      vitoriasJogador1: isBye ? 2 : 0,
      vitoriasJogador2: 0,
      status: isBye ? "finalizada" : "pendente",
      tipoBye: isBye ? "normal" : null,
      criadoEm: new Date(),
      ...props,
    });
  }
}
