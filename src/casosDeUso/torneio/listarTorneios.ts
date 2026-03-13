import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";

export type ListarTorneiosInputDto = Record<string, never>;

export type ListarTorneiosOutputDto = {
  torneios: Array<{
    id: string;
    nome: string;
    horario: Date;
    formato: string;
    donoId: string;
    status: string;
    rodadaAtual: number;
    totalRodadas: number;
    criadoEm: Date;
  }>;
};

export class ListarTorneios
  implements CasoDeUso<ListarTorneiosInputDto, ListarTorneiosOutputDto>
{
  private constructor(private readonly torneioGateway: TorneioGateway) {}

  public static criar(torneioGateway: TorneioGateway) {
    return new ListarTorneios(torneioGateway);
  }

  public async executar(_: ListarTorneiosInputDto): Promise<ListarTorneiosOutputDto> {
    const torneios = await this.torneioGateway.listar();

    return {
      torneios: torneios.map((t) => ({
        id: t.id,
        nome: t.nome,
        horario: t.horario,
        formato: t.formato,
        donoId: t.donoId,
        status: t.status,
        rodadaAtual: t.rodadaAtual,
        totalRodadas: t.totalRodadas,
        criadoEm: t.criadoEm,
      })),
    };
  }
}
