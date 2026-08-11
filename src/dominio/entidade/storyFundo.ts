import { v4 as uuidv4 } from "uuid";

export interface StoryFundoProps {
  id: string;
  nome: string;
  url: string;
  criadoEm?: Date;
}

export class StoryFundo {
  public id: string;
  public nome: string;
  public url: string;
  public criadoEm: Date;

  constructor(props: StoryFundoProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.url = props.url;
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
