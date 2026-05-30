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
  linkLigaMagic?: string | null;
  maindeck: Carta[];
  sideboard: Carta[];
  commander?: Carta[] | null;
  usuarioId: string;
  visualizacoes?: number;
  oculto?: boolean;
  travado?: boolean;
  torneioId?: string | null;
  deckOriginalId?: string | null;
  criadoEm?: Date;
}

export class Deck {
  public id: string;
  public nome: string;
  public nomeConsolidado: string | null;
  public formato: string;
  public linkLigaMagic: string | null;
  public maindeck: Carta[];
  public sideboard: Carta[];
  public commander: Carta[];
  public usuarioId: string;
  public visualizacoes: number;
  public oculto: boolean;
  public travado: boolean;
  public torneioId: string | null;
  public deckOriginalId: string | null;
  public criadoEm: Date;

  constructor({
    id,
    nome,
    nomeConsolidado,
    formato,
    linkLigaMagic,
    maindeck,
    sideboard,
    commander,
    usuarioId,
    visualizacoes,
    oculto,
    travado,
    torneioId,
    deckOriginalId,
    criadoEm,
  }: DeckProps) {
    this.id = id;
    this.nome = nome;
    this.nomeConsolidado = nomeConsolidado ?? null;
    this.formato = formato;
    this.linkLigaMagic = linkLigaMagic ?? null;
    this.maindeck = maindeck;
    this.sideboard = sideboard;
    this.commander = commander ?? [];
    this.usuarioId = usuarioId;
    this.visualizacoes = visualizacoes ?? 0;
    this.oculto = oculto ?? false;
    this.travado = travado ?? false;
    this.torneioId = torneioId ?? null;
    this.deckOriginalId = deckOriginalId ?? null;
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
