import { StoryFundoGateway } from "../../dominio/gateway/storyFundoGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type ExcluirStoryFundoInputDto = {
  id: string;
};

export type ExcluirStoryFundoOutputDto = {
  id: string;
  excluido: boolean;
};

export class ExcluirStoryFundo
  implements CasoDeUso<ExcluirStoryFundoInputDto, ExcluirStoryFundoOutputDto> {
  private constructor(private readonly storyFundoGateway: StoryFundoGateway) {}

  public static criar(storyFundoGateway: StoryFundoGateway) {
    return new ExcluirStoryFundo(storyFundoGateway);
  }

  public async executar(input: ExcluirStoryFundoInputDto): Promise<ExcluirStoryFundoOutputDto> {
    const excluido = await this.storyFundoGateway.excluir(input.id);
    if (!excluido) {
      throw ErroPersonalizado.criar({
        mensagem: "Fundo de story não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }
    return { id: input.id, excluido: true };
  }
}
