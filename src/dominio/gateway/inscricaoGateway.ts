import { Inscricao } from "../entidade/inscricao";

export interface InscricaoGateway {
  salvar(inscricao: Inscricao): Promise<void>;
  buscarPorTorneioEUsuario(
    torneioId: string,
    usuarioId: string
  ): Promise<Inscricao | null>;
  listarPorTorneio(torneioId: string): Promise<Inscricao[]>;
  atualizar(inscricao: Inscricao): Promise<void>;
}
