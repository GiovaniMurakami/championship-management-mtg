import { LigaGateway } from "../../dominio/gateway/ligaGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type ExcluirLigaInputDto = {
  id: string;
  requisitanteId: string;
  isAdmin: boolean;
};

export type ExcluirLigaOutputDto = {
  mensagem: string;
};

export class ExcluirLiga implements CasoDeUso<ExcluirLigaInputDto, ExcluirLigaOutputDto> {
  private constructor(private readonly ligaGateway: LigaGateway) {}

  public static criar(ligaGateway: LigaGateway) {
    return new ExcluirLiga(ligaGateway);
  }

  public async executar(input: ExcluirLigaInputDto): Promise<ExcluirLigaOutputDto> {
    const liga = await this.ligaGateway.buscarPorId(input.id);

    if (!liga) {
      throw ErroPersonalizado.criar({
        mensagem: "Liga não encontrada.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (liga.donoId !== input.requisitanteId && !input.isAdmin) {
      throw ErroPersonalizado.criar({
        mensagem: "Sem permissão para excluir esta liga.",
        status: StatusErro.erroProibido,
      });
    }

    await this.ligaGateway.excluir(input.id);

    return { mensagem: "Liga excluída com sucesso." };
  }
}
