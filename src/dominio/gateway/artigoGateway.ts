import { Artigo, ComentarioArtigo, StatusArtigo } from "../entidade/artigo";

export interface ArtigoGateway {
  salvar(artigo: Artigo): Promise<void>;
  buscarPorId(id: string): Promise<Artigo | null>;
  listar(filtro?: { status?: StatusArtigo | StatusArtigo[] }): Promise<Artigo[]>;
  excluir(id: string): Promise<boolean>;
  incrementarVisualizacoes(id: string): Promise<number>;
  salvarComentario(comentario: ComentarioArtigo): Promise<void>;
  buscarComentario(artigoId: string, comentarioId: string): Promise<ComentarioArtigo | null>;
  listarComentarios(artigoId: string): Promise<ComentarioArtigo[]>;
  curtir(artigoId: string, usuarioId: string): Promise<boolean>;
  descurtir(artigoId: string, usuarioId: string): Promise<boolean>;
  listarCurtidas(artigoId: string): Promise<string[]>;
  curtirComentario(artigoId: string, comentarioId: string, usuarioId: string): Promise<boolean>;
  descurtirComentario(artigoId: string, comentarioId: string, usuarioId: string): Promise<boolean>;
  listarCurtidasComentarios(artigoId: string): Promise<Array<{ comentarioId: string; usuarioId: string }>>;
}

export interface ConteudoArtigoGateway {
  gravar(chave: string, texto: string): Promise<void>;
  ler(chave: string): Promise<string | null>;
  excluir(chave: string): Promise<void>;
}
