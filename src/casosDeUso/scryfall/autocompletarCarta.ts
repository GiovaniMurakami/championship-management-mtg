import { ScryfallGateway } from "../../dominio/gateway/scryfallGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type AutocompletarCartaInputDto = {
  q: string;
};

export type AutocompletarCartaOutputDto = {
  sugestoes: string[];
};

export class AutocompletarCarta
  implements CasoDeUso<AutocompletarCartaInputDto, AutocompletarCartaOutputDto>
{
  private constructor(private readonly scryfallGateway: ScryfallGateway) {}

  public static criar(scryfallGateway: ScryfallGateway) {
    return new AutocompletarCarta(scryfallGateway);
  }

  public async executar(input: AutocompletarCartaInputDto): Promise<AutocompletarCartaOutputDto> {
    if (!input.q?.trim()) {
      throw ErroPersonalizado.criar({
        mensagem: "Parâmetro 'q' é obrigatório.",
        status: StatusErro.erroParametro,
      });
    }

    const sugestoes = await this.scryfallGateway.autocompletar(input.q.trim());
    return { sugestoes };
  }
}
