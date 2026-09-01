import { Deck } from "../entidade/deck";

export interface FiltrosListarDecks {
  usuarioId?: string;
  usuarioIds?: string[];
  formato?: string;
  nome?: string;
  incluirOcultos?: boolean;
  criadoApos?: Date;
  criadoAntes?: Date;
  limite?: number;
  offset?: number;
}

export interface DeckGateway {
  salvar(deck: Deck): Promise<void>;
  buscarPorId(id: string): Promise<Deck | null>;
  buscarPorPrefixo(prefixo: string): Promise<Deck | null>;
  buscarVarios(ids: string[]): Promise<Deck[]>;
  listarPorUsuario(usuarioId: string): Promise<Deck[]>;
  listarPorDeckOriginalId(deckOriginalId: string): Promise<Deck[]>;
  listar(filtros: FiltrosListarDecks): Promise<Deck[]>;
  listarTotal(filtros?: Pick<FiltrosListarDecks, "usuarioId" | "usuarioIds" | "formato" | "nome" | "incluirOcultos">): Promise<number>;
  atualizar(deck: Deck): Promise<void>;
  incrementarVisualizacoes(id: string): Promise<Deck | null>;
  excluir(id: string): Promise<void>;
  excluirPorUsuario(usuarioId: string): Promise<number>;
}
