import { randomUUID } from "crypto";

export type ParceiroProps = {
  id?: string;
  nome: string;
  imagemUrl: string;
  linkUrl?: string;
  ordem?: number;
  ativo?: boolean;
  criadoEm?: Date;
  atualizadoEm?: Date;
};

export class Parceiro {
  public id: string;
  public nome: string;
  public imagemUrl: string;
  public linkUrl?: string;
  public ordem: number;
  public ativo: boolean;
  public criadoEm: Date;
  public atualizadoEm: Date;

  constructor(props: ParceiroProps) {
    this.id = props.id ?? randomUUID();
    this.nome = props.nome;
    this.imagemUrl = props.imagemUrl;
    this.linkUrl = props.linkUrl;
    this.ordem = props.ordem ?? 0;
    this.ativo = props.ativo ?? true;
    this.criadoEm = props.criadoEm ?? new Date();
    this.atualizadoEm = props.atualizadoEm ?? new Date();
  }

  public static criar(props: ParceiroProps): Parceiro {
    return new Parceiro(props);
  }
}
