import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { obterRankPorPontos, PONTOS_RANK_INICIAL } from "../../dominio/regras/rank";
import { CasoDeUso } from "../casoDeUso";
import { normalizarPaginacaoOffset } from "../../helpers/paginacao";

const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 100;

export type ListarRankingUsuariosInputDto = {
  nome?: string;
  limite?: number;
  offset?: number;
};

export type ListarRankingUsuariosOutputDto = {
  ranking: Array<{
    posicao: number;
    usuarioId: string;
    nome: string;
    pontosRank: number;
    rank: string;
  }>;
  total: number;
  limite: number;
  offset: number;
};

export class ListarRankingUsuarios
  implements CasoDeUso<ListarRankingUsuariosInputDto, ListarRankingUsuariosOutputDto> {
  private constructor(private readonly usuarioGateway: UsuarioGateway) {}

  public static criar(usuarioGateway: UsuarioGateway) {
    return new ListarRankingUsuarios(usuarioGateway);
  }

  public async executar(
    input: ListarRankingUsuariosInputDto
  ): Promise<ListarRankingUsuariosOutputDto> {
    const { limite, offset } = normalizarPaginacaoOffset(
      input.limite,
      input.offset,
      LIMITE_PADRAO,
      LIMITE_MAXIMO
    );

    const { usuarios, total } = await this.usuarioGateway.listarRanking(limite, offset, input.nome);

    return {
      ranking: usuarios.map((usuario, index) => {
        const pontosRank = usuario.pontosRank ?? PONTOS_RANK_INICIAL;
        return {
          posicao: offset + index + 1,
          usuarioId: usuario.id,
          nome: usuario.nome,
          pontosRank,
          rank: obterRankPorPontos(pontosRank),
        };
      }),
      total,
      limite,
      offset,
    };
  }
}
