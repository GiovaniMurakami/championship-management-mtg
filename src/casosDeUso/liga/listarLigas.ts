import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { CasoDeUso } from "../casoDeUso";

export type ListarLigasInputDto = Record<string, never>;

export type ListarLigasOutputDto = {
  ligas: {
    id: string;
    nome: string;
    descricao?: string;
    donoId: string;
    totalTorneios: number;
    criadoEm: Date;
  }[];
};

export class ListarLigas implements CasoDeUso<ListarLigasInputDto, ListarLigasOutputDto> {
  private constructor(private readonly ligaGateway: LigaGateway) {}

  public static criar(ligaGateway: LigaGateway) {
    return new ListarLigas(ligaGateway);
  }

  public async executar(_input: ListarLigasInputDto): Promise<ListarLigasOutputDto> {
    const ligas = await this.ligaGateway.listar();

    return {
      ligas: ligas.map((liga) => ({
        id: liga.id,
        nome: liga.nome,
        descricao: liga.descricao,
        donoId: liga.donoId,
        totalTorneios: liga.torneioIds.length,
        criadoEm: liga.criadoEm,
      })),
    };
  }
}
