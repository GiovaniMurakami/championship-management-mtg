import { v4 as uuidv4 } from "uuid";

export type StoryTextoRodape = "claro" | "escuro";

export interface StoryFundoProps {
  id: string;
  nome: string;
  url: string;
  textoRodape?: StoryTextoRodape;
  criadoEm?: Date;
}

export class StoryFundo {
  public id: string;
  public nome: string;
  public url: string;
  public textoRodape: StoryTextoRodape;
  public criadoEm: Date;

  constructor(props: StoryFundoProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.url = props.url;
    this.textoRodape = props.textoRodape === "escuro" ? "escuro" : "claro";
    this.criadoEm = props.criadoEm || new Date();
  }

  public static criar(props: Omit<StoryFundoProps, "id" | "criadoEm">) {
    return new StoryFundo({
      id: uuidv4(),
      criadoEm: new Date(),
      ...props,
    });
  }
}
