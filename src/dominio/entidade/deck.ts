import { v4 as uuidv4 } from "uuid";

export interface Carta {
  nome: string;
  quantidade: number;
}

export interface DeckProps {
  id: string;
  nome: string;
  nomeConsolidado?: string | null;
  formato: string;
  maindeck: Carta[];
  sideboard: Carta[];
  commander?: Carta[] | null;
  usuarioId: string;
  criadoEm?: Date;
}

export class Deck {
  public id: string;
  public nome: string;
  public nomeConsolidado: string | null;
  public formato: string;
  public maindeck: Carta[];
  public sideboard: Carta[];
  public commander: Carta[];
  public usuarioId: string;
  public criadoEm: Date;

  constructor({
    id,
    nome,
    nomeConsolidado,
    formato,
    maindeck,
    sideboard,
    commander,
    usuarioId,
    criadoEm,
  }: DeckProps) {
    this.id = id;
    this.nome = nome;
    this.nomeConsolidado = nomeConsolidado ?? null;
    this.formato = formato;
    this.maindeck = maindeck;
    this.sideboard = sideboard;
    this.commander = commander ?? [];
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
