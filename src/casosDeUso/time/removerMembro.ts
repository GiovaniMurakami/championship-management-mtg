import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type RemoverMembroInputDto = {
  timeId: string;
  requisitanteId: string;
  isAdmin: boolean;
  membroId: string;
};

export type RemoverMembroOutputDto = {
  id: string;
  nome: string;
  tag: string;
  donoId: string;
  membroIds: string[];
  criadoEm: Date;
};

export class RemoverMembro implements CasoDeUso<RemoverMembroInputDto, RemoverMembroOutputDto> {
  private constructor(private readonly timeGateway: TimeGateway) {}

  public static criar(timeGateway: TimeGateway) {
    return new RemoverMembro(timeGateway);
  }

  public async executar(input: RemoverMembroInputDto): Promise<RemoverMembroOutputDto> {
    const time = await this.timeGateway.buscarPorId(input.timeId);
    if (!time) {
      throw ErroPersonalizado.criar({
        mensagem: "Time não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const ehDono = time.donoId === input.requisitanteId;
    const ehProprioMembro = input.requisitanteId === input.membroId;

    if (!ehDono && !ehProprioMembro && !input.isAdmin) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o dono do time pode remover membros, ou o próprio membro pode sair.",
        status: StatusErro.erroProibido,
      });
    }

    if (!time.membroIds.includes(input.membroId)) {
      throw ErroPersonalizado.criar({
        mensagem: "Usuário não é membro deste time.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (input.membroId === time.donoId) {
      throw ErroPersonalizado.criar({
        mensagem: "O dono não pode sair do time. Transfira a propriedade ou exclua o time.",
        status: StatusErro.erroParametro,
      });
    }

    time.membroIds = time.membroIds.filter((id) => id !== input.membroId);
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
