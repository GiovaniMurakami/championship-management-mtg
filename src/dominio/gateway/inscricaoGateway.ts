import { Inscricao } from "../entidade/inscricao";

export interface InscricaoGateway {
  salvar(inscricao: Inscricao): Promise<void>;
  buscarPorTorneioEUsuario(
    torneioId: string,
    usuarioId: string
  ): Promise<Inscricao | null>;
  listarPorTorneio(torneioId: string): Promise<Inscricao[]>;
  listarPorUsuario(usuarioId: string): Promise<Inscricao[]>;
  atualizar(inscricao: Inscricao): Promise<void>;
  excluir(id: string): Promise<void>;
  contarPorTorneios(torneioIds: string[]): Promise<Record<string, number>>;
}
