import { v4 as uuidv4 } from "uuid";

export interface TimeProps {
  id?: string;
  nome: string;
  tag: string;
  donoId: string;
  membroIds?: string[];
  fotoUrl?: string;
  criadoEm?: Date;
}

export class Time {
  public id: string;
  public nome: string;
  public tag: string;
  public donoId: string;
  public membroIds: string[];
  public fotoUrl?: string;
  public criadoEm: Date;

  constructor({ id, nome, tag, donoId, membroIds, fotoUrl, criadoEm }: TimeProps) {
    this.id = id ?? uuidv4();
    this.nome = nome;
    this.tag = tag;
    this.donoId = donoId;
    this.membroIds = membroIds ?? [];
    this.fotoUrl = fotoUrl;
    this.criadoEm = criadoEm ?? new Date();
  }

  public static criar(props: Omit<TimeProps, "id" | "criadoEm">): Time {
    return new Time({
      ...props,
      id: uuidv4(),
      criadoEm: new Date(),
    });
  }
}
