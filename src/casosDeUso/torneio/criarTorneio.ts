import { Torneio } from "../../dominio/entidade/torneio";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";

export type CriarTorneioInputDto = {
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
};

export type CriarTorneioOutputDto = {
  id: string;
  nome: string;
  horario: Date;
  formato: string;
  donoId: string;
  status: string;
  criadoEm: Date;
};

export class CriarTorneio
  implements CasoDeUso<CriarTorneioInputDto, CriarTorneioOutputDto>
{
  private constructor(private readonly torneioGateway: TorneioGateway) {}

  public static criar(torneioGateway: TorneioGateway) {
    return new CriarTorneio(torneioGateway);
  }

  public async executar(
    input: CriarTorneioInputDto
  ): Promise<CriarTorneioOutputDto> {
    const torneio = Torneio.criar({
      nome: input.nome.trim(),
      horario: input.horario,
      formato: input.formato.toLowerCase().trim(),
      donoId: input.donoId,
    });

    await this.torneioGateway.salvar(torneio);

    return {
      id: torneio.id,
      nome: torneio.nome,
      horario: torneio.horario,
      formato: torneio.formato,
      donoId: torneio.donoId,
      status: torneio.status,
      criadoEm: torneio.criadoEm,
    };
  }
}
