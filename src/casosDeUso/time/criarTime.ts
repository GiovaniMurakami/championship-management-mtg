import { Time } from "../../dominio/entidade/time";
import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type CriarTimeInputDto = {
  nome: string;
  tag: string;
  donoId: string;
  fotoUrl?: string;
};

export type CriarTimeOutputDto = {
  id: string;
  nome: string;
  tag: string;
  donoId: string;
  membroIds: string[];
  fotoUrl?: string;
  criadoEm: Date;
};

export class CriarTime implements CasoDeUso<CriarTimeInputDto, CriarTimeOutputDto> {
  private constructor(private readonly timeGateway: TimeGateway) {}

  public static criar(timeGateway: TimeGateway) {
    return new CriarTime(timeGateway);
  }

  public async executar(input: CriarTimeInputDto): Promise<CriarTimeOutputDto> {
    const nome = input.nome?.trim();
    if (!nome || nome.length < 2) {
      throw ErroPersonalizado.criar({
        mensagem: "Nome do time deve ter no mínimo 2 caracteres.",
        status: StatusErro.erroParametro,
      });
    }

    const tag = input.tag?.trim().toUpperCase();
    if (!tag || tag.length < 2 || tag.length > 4) {
      throw ErroPersonalizado.criar({
        mensagem: "Tag deve ter entre 2 e 4 caracteres.",
        status: StatusErro.erroParametro,
      });
    }

    const time = Time.criar({
      nome,
      tag,
      donoId: input.donoId,
      membroIds: [input.donoId],
      fotoUrl: input.fotoUrl,
    });

    await this.timeGateway.salvar(time);

    return {
      id: time.id,
      nome: time.nome,
      tag: time.tag,
      donoId: time.donoId,
      membroIds: time.membroIds,
      fotoUrl: time.fotoUrl,
      criadoEm: time.criadoEm,
    };
  }
}
