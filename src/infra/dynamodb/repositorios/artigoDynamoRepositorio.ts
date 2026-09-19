import { Artigo, ComentarioArtigo, StatusArtigo } from "../../../dominio/entidade/artigo";
import { ArtigoGateway } from "../../../dominio/gateway/artigoGateway";
import { BaseDynamoRepositorio } from "./baseDynamoRepositorio";

type ArtigoItem = {
  id: string;
  autorId: string;
  titulo: string;
  chamada: string;
  descricao: string;
  tags: string[];
  capaUrl?: string;
  conteudoS3Key: string;
  conteudoPublicadoS3Key?: string | null;
  status: StatusArtigo;
  visualizacoes: number;
  publicadoEm?: string | null;
  atualizadoEm: string;
  criadoEm: string;
};

type ComentarioItem = { id: string; artigoId: string; autorId: string; texto: string; criadoEm: string };
type CurtidaItem = { usuarioId: string };

const ARTIGOS_PK = "ARTIGOS";

export class ArtigoDynamoRepositorio extends BaseDynamoRepositorio implements ArtigoGateway {
  private constructor() { super(); }
  public static criar(): ArtigoDynamoRepositorio { return new ArtigoDynamoRepositorio(); }

  public async salvar(artigo: Artigo): Promise<void> {
    await this.putJson(ARTIGOS_PK, `ARTIGO#${artigo.id}`, this.paraItem(artigo), { entity: "ARTIGO" });
  }

  public async buscarPorId(id: string): Promise<Artigo | null> {
    const item = await this.getJson<ArtigoItem>(ARTIGOS_PK, `ARTIGO#${id}`);
    return item ? this.deItem(item) : null;
  }

  public async listar(filtro?: { status?: StatusArtigo | StatusArtigo[] }): Promise<Artigo[]> {
    const itens = await this.queryJson<ArtigoItem>(ARTIGOS_PK);
    const statusFiltro = filtro?.status
      ? (Array.isArray(filtro.status) ? filtro.status : [filtro.status])
      : null;
    return itens
      .filter((i) => Boolean(i.id && i.titulo))
      .map((i) => this.deItem(i))
      .filter((a) => !statusFiltro || statusFiltro.includes(a.status))
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  }

  public async excluir(id: string): Promise<boolean> {
    if (!await this.buscarPorId(id)) return false;
    const relacionados = await this.queryJson<ComentarioItem | CurtidaItem>(`ARTIGO#${id}`);
    const requests = relacionados.map((item) => this.toDeleteRequest(
      `ARTIGO#${id}`,
      "texto" in item ? `COMENTARIO#${(item as ComentarioItem).id}` : `CURTIDA#${(item as CurtidaItem).usuarioId}`
    ));
    await this.batchWrite(requests);
    await this.delete(ARTIGOS_PK, `ARTIGO#${id}`);
    return true;
  }

  public async incrementarVisualizacoes(id: string): Promise<number> {
    const artigo = await this.buscarPorId(id);
    if (!artigo) return 0;
    artigo.visualizacoes += 1;
    await this.salvar(artigo);
    return artigo.visualizacoes;
  }

  public async salvarComentario(comentario: ComentarioArtigo): Promise<void> {
    await this.putJson(`ARTIGO#${comentario.artigoId}`, `COMENTARIO#${comentario.id}`, {
      id: comentario.id,
      artigoId: comentario.artigoId,
      autorId: comentario.autorId,
      texto: comentario.texto,
      criadoEm: comentario.criadoEm.toISOString(),
    } satisfies ComentarioItem, { entity: "COMENTARIO_ARTIGO" });
  }

  public async listarComentarios(artigoId: string): Promise<ComentarioArtigo[]> {
    const itens = await this.queryJson<ComentarioItem | CurtidaItem>(`ARTIGO#${artigoId}`);
    return itens
      .filter((i): i is ComentarioItem => "texto" in i)
      .map((i) => new ComentarioArtigo({ ...i, criadoEm: new Date(i.criadoEm) }))
      .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
  }

  public async curtir(artigoId: string, usuarioId: string): Promise<boolean> {
    const pk = `ARTIGO#${artigoId}`;
    const sk = `CURTIDA#${usuarioId}`;
    if (await this.getJson<CurtidaItem>(pk, sk)) return false;
    await this.putJson(pk, sk, { usuarioId } satisfies CurtidaItem, { entity: "CURTIDA_ARTIGO" });
    return true;
  }

  public async descurtir(artigoId: string, usuarioId: string): Promise<boolean> {
    const pk = `ARTIGO#${artigoId}`;
    const sk = `CURTIDA#${usuarioId}`;
    if (!await this.getJson<CurtidaItem>(pk, sk)) return false;
    await this.delete(pk, sk);
    return true;
  }

  public async listarCurtidas(artigoId: string): Promise<string[]> {
    const itens = await this.queryJson<ComentarioItem | CurtidaItem>(`ARTIGO#${artigoId}`);
    return itens
      .filter((i): i is CurtidaItem => "usuarioId" in i && !("texto" in i))
      .map((i) => i.usuarioId);
  }

  private paraItem(artigo: Artigo): ArtigoItem {
    return {
      id: artigo.id,
      autorId: artigo.autorId,
      titulo: artigo.titulo,
      chamada: artigo.chamada,
      descricao: artigo.descricao,
      tags: artigo.tags,
      capaUrl: artigo.capaUrl,
      conteudoS3Key: artigo.conteudoS3Key,
      conteudoPublicadoS3Key: artigo.conteudoPublicadoS3Key ?? null,
      status: artigo.status,
      visualizacoes: artigo.visualizacoes,
      publicadoEm: artigo.publicadoEm ? artigo.publicadoEm.toISOString() : null,
      atualizadoEm: artigo.atualizadoEm.toISOString(),
      criadoEm: artigo.criadoEm.toISOString(),
    };
  }

  private deItem(item: ArtigoItem): Artigo {
    return new Artigo({
      ...item,
      publicadoEm: item.publicadoEm ? new Date(item.publicadoEm) : null,
      atualizadoEm: new Date(item.atualizadoEm),
      criadoEm: new Date(item.criadoEm),
    });
  }
}
