import { randomUUID } from "crypto";

export type TipoLiga = "individual" | "times";

export type LigaProps = {
  id?: string;
  nome: string;
  descricao?: string;
  bannerUrl?: string;
  donoId: string;
  torneioIds?: string[];
  tipo?: TipoLiga;
  /** Pin global (admin): aparece no topo das listagens para todos. */
  fixado?: boolean;
  criadoEm?: Date;
};

export class Liga {
  public id: string;
  public nome: string;
  public descricao?: string;
  public bannerUrl?: string;
  public donoId: string;
  public torneioIds: string[];
  public tipo: TipoLiga;
  public fixado: boolean;
  public criadoEm: Date;

  constructor(props: LigaProps) {
    this.id = props.id ?? randomUUID();
    this.nome = props.nome;
    this.descricao = props.descricao;
    this.bannerUrl = props.bannerUrl;
    this.donoId = props.donoId;
    this.torneioIds = props.torneioIds ?? [];
    this.tipo = props.tipo ?? "individual";
    this.fixado = props.fixado ?? false;
    this.criadoEm = props.criadoEm ?? new Date();
  }

  public static criar(props: LigaProps): Liga {
    return new Liga(props);
  }
}
