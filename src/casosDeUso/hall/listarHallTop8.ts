import { HallTop8Gateway } from "../../dominio/gateway/hallTop8Gateway";
import { CasoDeUso } from "../casoDeUso";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

const LIMITE_PADRAO = 24;

export class ListarHallTop8 implements CasoDeUso<
  { limite?: number; offset?: number; incluirInativos?: boolean },
  unknown
> {
  private constructor(private readonly hallGateway: HallTop8Gateway) {}

  public static criar(hallGateway: HallTop8Gateway) {
    return new ListarHallTop8(hallGateway);
  }

  public async executar(input: {
    limite?: number;
    offset?: number;
    incluirInativos?: boolean;
  } = {}) {
    const limite = Math.min(100, Math.max(1, Number(input.limite) || LIMITE_PADRAO));
    const offset = Math.max(0, Number(input.offset) || 0);
    const incluirInativos = Boolean(input.incluirInativos);

    let todos = await this.hallGateway.listar();
    if (!incluirInativos) {
      todos = todos.filter((item) => item.ativo);
    }

    const pagina = todos.slice(offset, offset + limite);
    return {
      itens: pagina.map((item) => ({
        id: item.id,
        torneioId: item.torneioId,
        torneioNome: item.torneioNome,
        imagemUrl: item.imagemUrl,
        ativo: item.ativo,
        dataTorneio: toBrasiliaISO(item.dataTorneio || item.criadoEm),
        criadoEm: toBrasiliaISO(item.criadoEm),
      })),
      total: todos.length,
      limite,
      offset,
    };
  }
}
