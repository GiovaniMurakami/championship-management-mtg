import { Deck } from "../entidade/deck";

export interface FiltrosListarDecks {
  usuarioId?: string;
  formato?: string;
  nome?: string;
  criadoApos?: Date;
  criadoAntes?: Date;
  limite?: number;
  offset?: number;
}

export interface DeckGateway {
  salvar(deck: Deck): Promise<void>;
  buscarPorId(id: string): Promise<Deck | null>;
  buscarVarios(ids: string[]): Promise<Deck[]>;
  listarPorUsuario(usuarioId: string): Promise<Deck[]>;
  listar(filtros: FiltrosListarDecks): Promise<Deck[]>;
  listarTotal(filtros?: Pick<FiltrosListarDecks, "usuarioId" | "formato" | "nome">): Promise<number>;
  atualizar(deck: Deck): Promise<void>;
  excluir(id: string): Promise<void>;
}
