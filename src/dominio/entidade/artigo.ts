import { v4 as uuidv4 } from "uuid";

export type StatusArtigo = "rascunho" | "pendente" | "pendente_edicao" | "publicado" | "rejeitado";

export interface ArtigoProps {
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
  visualizacoes?: number;
  publicadoEm?: Date | null;
  atualizadoEm?: Date;
  criadoEm?: Date;
}

export class Artigo {
  public id: string;
  public autorId: string;
  public titulo: string;
  public chamada: string;
  public descricao: string;
  public tags: string[];
  public capaUrl?: string;
  public conteudoS3Key: string;
  public conteudoPublicadoS3Key?: string | null;
  public status: StatusArtigo;
  public visualizacoes: number;
  public publicadoEm?: Date | null;
  public atualizadoEm: Date;
  public criadoEm: Date;

  public constructor(props: ArtigoProps) {
    this.id = props.id;
    this.autorId = props.autorId;
    this.titulo = props.titulo;
    this.chamada = props.chamada;
    this.descricao = props.descricao;
    this.tags = props.tags ?? [];
    this.capaUrl = props.capaUrl;
    this.conteudoS3Key = props.conteudoS3Key;
    this.conteudoPublicadoS3Key = props.conteudoPublicadoS3Key ?? null;
    this.status = props.status;
    this.visualizacoes = props.visualizacoes ?? 0;
    this.publicadoEm = props.publicadoEm ?? null;
    this.atualizadoEm = props.atualizadoEm ?? new Date();
    this.criadoEm = props.criadoEm ?? new Date();
  }

  public static criar(input: Omit<ArtigoProps, "id" | "criadoEm" | "atualizadoEm" | "visualizacoes" | "status"> & { status?: StatusArtigo }): Artigo {
    const agora = new Date();
    return new Artigo({
      ...input,
      id: uuidv4(),
      status: input.status ?? "pendente",
      visualizacoes: 0,
      criadoEm: agora,
      atualizadoEm: agora,
    });
  }

  public chaveConteudoPublico(): string | null {
    if (this.status === "publicado" || this.status === "pendente_edicao") {
      return this.conteudoPublicadoS3Key || this.conteudoS3Key;
    }
    return this.conteudoPublicadoS3Key || null;
  }
}

export interface ComentarioArtigoProps {
  id: string;
  artigoId: string;
  autorId: string;
  texto: string;
  criadoEm?: Date;
}

export class ComentarioArtigo {
  public id: string;
  public artigoId: string;
  public autorId: string;
  public texto: string;
  public criadoEm: Date;

  public constructor(props: ComentarioArtigoProps) {
    this.id = props.id;
    this.artigoId = props.artigoId;
    this.autorId = props.autorId;
    this.texto = props.texto;
    this.criadoEm = props.criadoEm ?? new Date();
  }

  public static criar(input: Omit<ComentarioArtigoProps, "id" | "criadoEm">): ComentarioArtigo {
    return new ComentarioArtigo({ ...input, id: uuidv4(), criadoEm: new Date() });
  }
}
