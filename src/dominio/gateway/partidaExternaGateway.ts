export type PartidaExterna = {
  id: string;
  usuarioId: string;
  resultado: "vitoria" | "derrota" | "empate";
  data: string;
  criadoEm?: string;
  oponente?: string;
  campeonato?: string;
  deckNome?: string;
  deckAdversarioNome?: string;
};

export interface PartidaExternaGateway {
  salvar(partida: PartidaExterna): Promise<void>;
  listarPorUsuario(usuarioId: string): Promise<PartidaExterna[]>;
}
