import { v4 as uuidv4 } from "uuid";

export interface FotoGaleriaProps {
  id: string;
  url: string;
  titulo?: string;
  criadoPorId: string;
  criadoEm?: Date;
}

export class FotoGaleria {
  public id: string;
  public url: string;
  public titulo: string;
  public criadoPorId: string;
  public criadoEm: Date;

  constructor(props: FotoGaleriaProps) {
    this.id = props.id;
    this.url = props.url;
    this.titulo = (props.titulo || "").trim();
    this.criadoPorId = props.criadoPorId;
    this.criadoEm = props.criadoEm || new Date();
  }

  public static criar(props: Omit<FotoGaleriaProps, "id" | "criadoEm">) {
    return new FotoGaleria({
      id: uuidv4(),
      criadoEm: new Date(),
      ...props,
    });
  }
}
