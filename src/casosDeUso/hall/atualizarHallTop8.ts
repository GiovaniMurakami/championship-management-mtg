import { HallTop8Gateway } from "../../dominio/gateway/hallTop8Gateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";

export class AtualizarHallTop8 implements CasoDeUso<
  { id: string; ativo?: boolean; dataTorneio?: string },
  unknown
> {
  private constructor(private readonly hallGateway: HallTop8Gateway) {}

  public static criar(hallGateway: HallTop8Gateway) {
    return new AtualizarHallTop8(hallGateway);
  }

  public async executar(input: { id: string; ativo?: boolean; dataTorneio?: string }) {
    const item = await this.hallGateway.buscarPorId(input.id);
    if (!item) {
      throw ErroPersonalizado.criar({
        mensagem: "Item do Hall da Fama não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const dataTorneio = input.dataTorneio
      ? new Date(input.dataTorneio)
      : (item.dataTorneio || item.criadoEm);

    const atualizado = {
      ...item,
      ativo: input.ativo !== undefined ? Boolean(input.ativo) : item.ativo,
      dataTorneio,
    };
    await this.hallGateway.salvar(atualizado);

    return {
      id: atualizado.id,
      torneioId: atualizado.torneioId,
      torneioNome: atualizado.torneioNome,
      imagemUrl: atualizado.imagemUrl,
      ativo: atualizado.ativo,
      dataTorneio: toBrasiliaISO(atualizado.dataTorneio || atualizado.criadoEm),
      criadoEm: toBrasiliaISO(atualizado.criadoEm),
    };
  }
}
