import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import {
  obterPontosParaProximoRank,
  obterProximoRank,
  obterRankPorPontos,
  PONTOS_RANK_INICIAL,
  RankTier,
} from "../../dominio/regras/rank";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type BuscarRankUsuarioInputDto = {
  usuarioId: string;
};

export type BuscarRankUsuarioOutputDto = {
  usuarioId: string;
  nome: string;
  pontosRank: number;
  rank: RankTier;
  proximoRank: RankTier | null;
  pontosParaProximoRank: number | null;
};

export class BuscarRankUsuario
  implements CasoDeUso<BuscarRankUsuarioInputDto, BuscarRankUsuarioOutputDto> {
  private constructor(private readonly usuarioGateway: UsuarioGateway) {}

  public static criar(usuarioGateway: UsuarioGateway) {
    return new BuscarRankUsuario(usuarioGateway);
  }

  public async executar(input: BuscarRankUsuarioInputDto): Promise<BuscarRankUsuarioOutputDto> {
    const usuario = await this.usuarioGateway.buscarPorId(input.usuarioId);
    if (!usuario) {
      throw ErroPersonalizado.criar({
        mensagem: "Usuário não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const pontosRank = usuario.pontosRank ?? PONTOS_RANK_INICIAL;
    const rank = obterRankPorPontos(pontosRank);

    return {
      usuarioId: usuario.id,
      nome: usuario.nome,
      pontosRank,
      rank,
      proximoRank: obterProximoRank(rank),
      pontosParaProximoRank: obterPontosParaProximoRank(pontosRank),
    };
  }
}
