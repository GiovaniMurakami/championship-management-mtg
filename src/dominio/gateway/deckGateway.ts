import { Deck } from "../entidade/deck";

export interface DeckGateway {
  salvar(deck: Deck): Promise<void>;
  buscarPorId(id: string): Promise<Deck | null>;
  listarPorUsuario(usuarioId: string): Promise<Deck[]>;
  atualizar(deck: Deck): Promise<void>;
  excluir(id: string): Promise<void>;
}
