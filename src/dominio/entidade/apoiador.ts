import { randomUUID } from "crypto";

export type ApoiadorProps = {
  id?: string;
  nome: string;
  ordem?: number;
  ativo?: boolean;
  criadoEm?: Date;
  atualizadoEm?: Date;
};

export class Apoiador {
  public id: string;
  public nome: string;
  public ordem: number;
  public ativo: boolean;
  public criadoEm: Date;
  public atualizadoEm: Date;

  constructor(props: ApoiadorProps) {
    this.id = props.id ?? randomUUID();
    this.nome = props.nome;
    this.ordem = props.ordem ?? 0;
    this.ativo = props.ativo ?? true;
    this.criadoEm = props.criadoEm ?? new Date();
    this.atualizadoEm = props.atualizadoEm ?? new Date();
  }

  public static criar(props: ApoiadorProps): Apoiador {
    return new Apoiador(props);
  }
}
