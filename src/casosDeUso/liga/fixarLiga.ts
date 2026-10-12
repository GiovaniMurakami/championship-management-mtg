import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { CacheGateway } from "../../dominio/gateway/cacheGateway";
import { CACHE_PK_LIGAS } from "../../helpers/cache/chavesCache";

export type FixarLigaInputDto = {
  ligaId: string;
  fixado: boolean;
};

export class FixarLiga implements CasoDeUso<FixarLigaInputDto, { id: string; fixado: boolean }> {
  private constructor(
    private readonly ligaGateway: LigaGateway,
    private readonly cache?: CacheGateway,
  ) {}

  public static criar(ligaGateway: LigaGateway, cache?: CacheGateway) {
    return new FixarLiga(ligaGateway, cache);
  }

  public async executar(input: FixarLigaInputDto) {
    const liga = await this.ligaGateway.buscarPorId(input.ligaId);
    if (!liga) {
      throw ErroPersonalizado.criar({
        mensagem: "Liga não encontrada.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    liga.fixado = input.fixado;
    await this.ligaGateway.atualizar(liga);
    await this.cache?.invalidarParticao(CACHE_PK_LIGAS);

    return { id: liga.id, fixado: liga.fixado };
  }
}
