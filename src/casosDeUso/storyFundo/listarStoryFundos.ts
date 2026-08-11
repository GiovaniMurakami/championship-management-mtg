import { StoryFundoGateway } from "../../dominio/gateway/storyFundoGateway";
import { CasoDeUso } from "../casoDeUso";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

export type ListarStoryFundosOutputDto = {
  fundos: Array<{
    id: string;
    nome: string;
    url: string;
    criadoEm: string;
  }>;
};

export class ListarStoryFundos
  implements CasoDeUso<void, ListarStoryFundosOutputDto> {
  private constructor(private readonly storyFundoGateway: StoryFundoGateway) {}

  public static criar(storyFundoGateway: StoryFundoGateway) {
    return new ListarStoryFundos(storyFundoGateway);
  }

  public async executar(): Promise<ListarStoryFundosOutputDto> {
    const fundos = await this.storyFundoGateway.listar();
    return {
      fundos: fundos.map((f) => ({
        id: f.id,
        nome: f.nome,
        url: f.url,
        criadoEm: toBrasiliaISO(f.criadoEm)!,
      })),
    };
  }
}
