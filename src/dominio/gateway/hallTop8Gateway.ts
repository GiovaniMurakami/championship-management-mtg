export type HallTop8Item = {
  id: string;
  torneioId: string;
  torneioNome: string;
  imagemUrl: string;
  ativo: boolean;
  dataTorneio: Date;
  criadoEm: Date;
};

export interface HallTop8Gateway {
  salvar(item: HallTop8Item): Promise<void>;
  listar(): Promise<HallTop8Item[]>;
  buscarPorId(id: string): Promise<HallTop8Item | null>;
  excluir(id: string): Promise<boolean>;
}
