import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { TipoLiga } from "../../dominio/entidade/liga";
import { CasoDeUso } from "../casoDeUso";
import { normalizarPaginacaoOffset } from "../../helpers/paginacao";

const LIMITE_MAXIMO_LIGAS = 100;
const LIMITE_PADRAO_LIGAS = 20;

export type ListarLigasInputDto = {
  limite?: number;
  offset?: number;
  tipo?: TipoLiga;
  nome?: string;
};

export type ListarLigasOutputDto = {
  ligas: {
    id: string;
    nome: string;
    descricao?: string;
    bannerUrl?: string;
    donoId: string;
    tipo: TipoLiga;
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
    const { limite, offset } = normalizarPaginacaoOffset(
      input.limite,
      input.offset,
      LIMITE_PADRAO_LIGAS,
      LIMITE_MAXIMO_LIGAS
    );
    const { tipo, nome } = input;

    const [ligas, total] = await Promise.all([
      this.ligaGateway.listar({ limite, offset, tipo, nome }),
      this.ligaGateway.listarTotal({ tipo, nome }),
    ]);

    return {
      ligas: ligas.map((liga) => ({
        id: liga.id,
        nome: liga.nome,
        descricao: liga.descricao,
        bannerUrl: liga.bannerUrl,
        donoId: liga.donoId,
        tipo: liga.tipo,
        totalTorneios: liga.torneioIds.length,
        criadoEm: liga.criadoEm,
      })),
      total,
      limite,
      offset,
    };
  }
}
