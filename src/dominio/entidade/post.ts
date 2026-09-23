import { v4 as uuidv4 } from "uuid";

export interface PostProps {
  id: string;
  autorId: string;
  legenda: string;
  imagens: string[];
  criadoEm?: Date;
}

export class Post {
  public id: string;
  public autorId: string;
  public legenda: string;
  public imagens: string[];
  public criadoEm: Date;

  public constructor({ id, autorId, legenda, imagens, criadoEm }: PostProps) {
    this.id = id;
    this.autorId = autorId;
    this.legenda = legenda;
    this.imagens = imagens;
    this.criadoEm = criadoEm ?? new Date();
  }

  public static criar(input: Omit<PostProps, "id" | "criadoEm">): Post {
    return new Post({ ...input, id: uuidv4(), criadoEm: new Date() });
  }
}

export interface ComentarioPostProps {
  id: string;
  postId: string;
  autorId: string;
  texto: string;
  criadoEm?: Date;
}

export class ComentarioPost {
  public id: string;
  public postId: string;
  public autorId: string;
  public texto: string;
  public criadoEm: Date;

  public constructor({ id, postId, autorId, texto, criadoEm }: ComentarioPostProps) {
    this.id = id;
    this.postId = postId;
    this.autorId = autorId;
    this.texto = texto;
    this.criadoEm = criadoEm ?? new Date();
  }

  public static criar(input: Omit<ComentarioPostProps, "id" | "criadoEm">): ComentarioPost {
    return new ComentarioPost({ ...input, id: uuidv4(), criadoEm: new Date() });
  }
}
