import { v4 as uuidv4 } from "uuid";

export interface Carta {
  nome: string;
  quantidade: number;
}

export interface DeckProps {
  id: string;
  nome: string;
  formato: string;
  maindeck: Carta[];
  sideboard: Carta[];
  usuarioId: string;
  criadoEm?: Date;
}

export class Deck {
  public id: string;
  public nome: string;
  public formato: string;
  public maindeck: Carta[];
  public sideboard: Carta[];
  public usuarioId: string;
  public criadoEm: Date;

  constructor({
    id,
    nome,
    formato,
    maindeck,
    sideboard,
    usuarioId,
    criadoEm,
  }: DeckProps) {
    this.id = id;
    this.nome = nome;
    this.formato = formato;
    this.maindeck = maindeck;
    this.sideboard = sideboard;
    this.usuarioId = usuarioId;
    this.criadoEm = criadoEm || new Date();
  }

  public static criar(
    props: Omit<DeckProps, "id" | "criadoEm">
  ) {
    return new Deck({
      id: uuidv4(),
      criadoEm: new Date(),
      ...props,
    });
  }
}
