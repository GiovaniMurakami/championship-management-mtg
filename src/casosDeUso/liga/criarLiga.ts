import { Liga, TipoLiga } from "../../dominio/entidade/liga";
import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { CacheDynamoDbServico } from "../../infra/services/cacheDynamoDbServico";
import { CACHE_PK_LIGAS } from "../../helpers/cache/chavesCache";

export type CriarLigaInputDto = {
  nome: string;
  donoId: string;
  descricao?: string;
  torneioIds?: string[];
  tipo?: TipoLiga;
};

export type CriarLigaOutputDto = {
  id: string;
  nome: string;
  descricao?: string;
  donoId: string;
  torneioIds: string[];
  tipo: TipoLiga;
  criadoEm: Date;
};

export class CriarLiga implements CasoDeUso<CriarLigaInputDto, CriarLigaOutputDto> {
  private constructor(
    private readonly ligaGateway: LigaGateway,
    private readonly torneioGateway: TorneioGateway,
    private readonly cache?: CacheDynamoDbServico
  ) {}

  public static criar(
    ligaGateway: LigaGateway,
    torneioGateway: TorneioGateway,
    cache?: CacheDynamoDbServico
  ) {
    return new CriarLiga(ligaGateway, torneioGateway, cache);
  }

  public async executar(input: CriarLigaInputDto): Promise<CriarLigaOutputDto> {
    const torneioIds = input.torneioIds ?? [];

    for (const torneioId of torneioIds) {
      const torneio = await this.torneioGateway.buscarPorId(torneioId);
      if (!torneio) {
        throw ErroPersonalizado.criar({
          mensagem: `Torneio não encontrado: ${torneioId}`,
          status: StatusErro.erroNaoEncontrado,
        });
      }
    }

    const liga = Liga.criar({
      nome: input.nome.trim(),
      descricao: input.descricao?.trim(),
      donoId: input.donoId,
      torneioIds,
      tipo: input.tipo,
    });

    await this.ligaGateway.salvar(liga);
    await this.cache?.invalidarParticao(CACHE_PK_LIGAS);

    return {
      id: liga.id,
      nome: liga.nome,
      descricao: liga.descricao,
      donoId: liga.donoId,
      torneioIds: liga.torneioIds,
      tipo: liga.tipo,
      criadoEm: liga.criadoEm,
    };
  }
}
