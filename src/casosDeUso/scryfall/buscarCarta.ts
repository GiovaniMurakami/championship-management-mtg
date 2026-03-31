import { CartaScryfall, ScryfallGateway } from "../../dominio/gateway/scryfallGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type BuscarCartaInputDto = {
  nome: string;
};

export type BuscarCartaOutputDto = CartaScryfall;

export class BuscarCarta implements CasoDeUso<BuscarCartaInputDto, BuscarCartaOutputDto> {
  private constructor(private readonly scryfallGateway: ScryfallGateway) {}

  public static criar(scryfallGateway: ScryfallGateway) {
    return new BuscarCarta(scryfallGateway);
  }

  public async executar(input: BuscarCartaInputDto): Promise<BuscarCartaOutputDto> {
    if (!input.nome?.trim()) {
      throw ErroPersonalizado.criar({
        mensagem: "Nome da carta é obrigatório.",
        status: StatusErro.erroParametro,
      });
    }

    const carta = await this.scryfallGateway.buscarCarta(input.nome.trim());

    if (!carta) {
      throw ErroPersonalizado.criar({
        mensagem: "Carta não encontrada.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    return carta;
  }
}
