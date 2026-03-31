import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";

export type ListarTimesInputDto = Record<string, never>;

export type ListarTimesOutputDto = Array<{
  id: string;
  nome: string;
  tag: string;
  donoId: string;
  membroCount: number;
  fotoUrl?: string;
  criadoEm: Date;
}>;

export class ListarTimes implements CasoDeUso<ListarTimesInputDto, ListarTimesOutputDto> {
  private constructor(private readonly timeGateway: TimeGateway) {}

  public static criar(timeGateway: TimeGateway) {
    return new ListarTimes(timeGateway);
  }

  public async executar(_input: ListarTimesInputDto): Promise<ListarTimesOutputDto> {
    const times = await this.timeGateway.listar();
    return times.map((t) => ({
      id: t.id,
      nome: t.nome,
      tag: t.tag,
      donoId: t.donoId,
      membroCount: t.membroIds.length,
      fotoUrl: t.fotoUrl,
      criadoEm: t.criadoEm,
    }));
  }
}
