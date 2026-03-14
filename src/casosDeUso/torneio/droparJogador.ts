import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type DroparJogadorInputDto = {
  torneioId: string;
  // quem está executando a ação (pode ser o próprio jogador ou o dono)
  requisitanteId: string;
  // jogador a ser dropado (se o próprio jogador dropar, é o mesmo que requisitanteId)
  jogadorId: string;
};

export type DroparJogadorOutputDto = {
  inscricaoId: string;
  torneioId: string;
  jogadorId: string;
  dropped: boolean;
};

export class DroparJogador
  implements CasoDeUso<DroparJogadorInputDto, DroparJogadorOutputDto>
{
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway
  ) {}

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway
  ) {
    return new DroparJogador(torneioGateway, inscricaoGateway);
  }

  public async executar(
    input: DroparJogadorInputDto
  ): Promise<DroparJogadorOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (torneio.status === "finalizado") {
      throw ErroPersonalizado.criar({
        mensagem: "O torneio já foi finalizado.",
        status: StatusErro.erroParametro,
      });
    }

    // Apenas o próprio jogador ou o dono do torneio podem dropar
    const ehDono = torneio.donoId === input.requisitanteId;
    const ehProprioJogador = input.requisitanteId === input.jogadorId;

    if (!ehDono && !ehProprioJogador) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o próprio jogador ou o dono do torneio podem executar esta ação.",
        status: StatusErro.erroProibido,
      });
    }

    const inscricao = await this.inscricaoGateway.buscarPorTorneioEUsuario(
      input.torneioId,
      input.jogadorId
    );

    if (!inscricao) {
      throw ErroPersonalizado.criar({
        mensagem: "Jogador não está inscrito neste torneio.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (inscricao.dropped) {
      throw ErroPersonalizado.criar({
        mensagem: "Jogador já foi dropado deste torneio.",
        status: StatusErro.erroParametro,
      });
    }

    inscricao.dropped = true;
    await this.inscricaoGateway.atualizar(inscricao);

    return {
      inscricaoId: inscricao.id,
      torneioId: inscricao.torneioId,
      jogadorId: inscricao.usuarioId,
      dropped: true,
    };
  }
}
