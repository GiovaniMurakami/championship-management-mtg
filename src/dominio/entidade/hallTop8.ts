import { v4 as uuidv4 } from "uuid";

export type HallTop8Props = {
  id: string;
  torneioId: string;
  torneioNome?: string;
  imagemUrl: string;
  ativo?: boolean;
  dataTorneio?: Date;
  criadoEm?: Date;
};

export class HallTop8 {
  public id: string;
  public torneioId: string;
  public torneioNome: string;
  public imagemUrl: string;
  public ativo: boolean;
  public dataTorneio: Date;
  public criadoEm: Date;

  constructor(props: HallTop8Props) {
    this.id = props.id;
    this.torneioId = props.torneioId;
    this.torneioNome = (props.torneioNome || "").trim();
    this.imagemUrl = props.imagemUrl;
    this.ativo = props.ativo !== false;
    this.criadoEm = props.criadoEm || new Date();
    this.dataTorneio = props.dataTorneio || this.criadoEm;
  }

  public static criar(props: Omit<HallTop8Props, "id" | "criadoEm">) {
    return new HallTop8({
      id: uuidv4(),
      criadoEm: new Date(),
      ...props,
    });
  }
}
