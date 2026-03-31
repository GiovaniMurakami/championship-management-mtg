import { ResultadoValidarDecklist, ScryfallGateway } from "../../dominio/gateway/scryfallGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type ValidarDecklistInputDto = {
  cartas: string[];
  formato?: string;
};

export type ValidarDecklistOutputDto = ResultadoValidarDecklist;

export class ValidarDecklist
  implements CasoDeUso<ValidarDecklistInputDto, ValidarDecklistOutputDto>
{
  private constructor(private readonly scryfallGateway: ScryfallGateway) {}

  public static criar(scryfallGateway: ScryfallGateway) {
    return new ValidarDecklist(scryfallGateway);
  }

  public async executar(input: ValidarDecklistInputDto): Promise<ValidarDecklistOutputDto> {
    if (!Array.isArray(input.cartas) || input.cartas.length === 0) {
      throw ErroPersonalizado.criar({
        mensagem: "A lista de cartas não pode ser vazia.",
        status: StatusErro.erroParametro,
      });
    }

    return this.scryfallGateway.validarDecklist(input.cartas, input.formato);
  }
}
