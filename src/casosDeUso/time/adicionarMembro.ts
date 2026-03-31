import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type AdicionarMembroInputDto = {
  timeId: string;
  requisitanteId: string;
  isAdmin: boolean;
  novoMembroId: string;
};

export type AdicionarMembroOutputDto = {
  id: string;
  nome: string;
  tag: string;
  donoId: string;
  membroIds: string[];
  criadoEm: Date;
};

export class AdicionarMembro implements CasoDeUso<AdicionarMembroInputDto, AdicionarMembroOutputDto> {
  private constructor(
    private readonly timeGateway: TimeGateway,
    private readonly usuarioGateway: UsuarioGateway
  ) {}

  public static criar(timeGateway: TimeGateway, usuarioGateway: UsuarioGateway) {
    return new AdicionarMembro(timeGateway, usuarioGateway);
  }

  public async executar(input: AdicionarMembroInputDto): Promise<AdicionarMembroOutputDto> {
    const time = await this.timeGateway.buscarPorId(input.timeId);
    if (!time) {
      throw ErroPersonalizado.criar({
        mensagem: "Time não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (time.donoId !== input.requisitanteId && !input.isAdmin) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o dono do time pode adicionar membros.",
        status: StatusErro.erroProibido,
      });
    }

    if (time.membroIds.includes(input.novoMembroId)) {
      throw ErroPersonalizado.criar({
        mensagem: "Usuário já é membro deste time.",
        status: StatusErro.erroParametro,
      });
    }

    const novoMembro = await this.usuarioGateway.buscarPorId(input.novoMembroId);
    if (!novoMembro) {
      throw ErroPersonalizado.criar({
        mensagem: "Usuário não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    time.membroIds.push(input.novoMembroId);
    await this.timeGateway.atualizar(time);

    return {
      id: time.id,
      nome: time.nome,
      tag: time.tag,
      donoId: time.donoId,
      membroIds: time.membroIds,
      criadoEm: time.criadoEm,
    };
  }
}
