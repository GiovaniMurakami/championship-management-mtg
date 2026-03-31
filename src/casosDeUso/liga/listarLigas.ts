import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { CasoDeUso } from "../casoDeUso";

const LIMITE_MAXIMO_LIGAS = 100;
const LIMITE_PADRAO_LIGAS = 20;

export type ListarLigasInputDto = {
  limite?: number;
  offset?: number;
};

export type ListarLigasOutputDto = {
  ligas: {
    id: string;
    nome: string;
    descricao?: string;
    donoId: string;
    totalTorneios: number;
    criadoEm: Date;
  }[];
  total: number;
  limite: number;
  offset: number;
};

export class ListarLigas implements CasoDeUso<ListarLigasInputDto, ListarLigasOutputDto> {
  private constructor(private readonly ligaGateway: LigaGateway) {}

  public static criar(ligaGateway: LigaGateway) {
    return new ListarLigas(ligaGateway);
  }

  public async executar(input: ListarLigasInputDto): Promise<ListarLigasOutputDto> {
    const limite = Math.min(input.limite ?? LIMITE_PADRAO_LIGAS, LIMITE_MAXIMO_LIGAS);
    const offset = Math.max(input.offset ?? 0, 0);

    const [ligas, total] = await Promise.all([
      this.ligaGateway.listar({ limite, offset }),
      this.ligaGateway.listarTotal(),
    ]);

    return {
      ligas: ligas.map((liga) => ({
        id: liga.id,
        nome: liga.nome,
        descricao: liga.descricao,
        donoId: liga.donoId,
        totalTorneios: liga.torneioIds.length,
        criadoEm: liga.criadoEm,
      })),
      total,
      limite,
      offset,
    };
  }
}
