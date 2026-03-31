import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type AlterarTimeInputDto = {
  id: string;
  requisitanteId: string;
  isAdmin: boolean;
  nome?: string;
  tag?: string;
  fotoUrl?: string;
};

export type AlterarTimeOutputDto = {
  id: string;
  nome: string;
  tag: string;
  donoId: string;
  membroIds: string[];
  fotoUrl?: string;
  criadoEm: Date;
};

export class AlterarTime implements CasoDeUso<AlterarTimeInputDto, AlterarTimeOutputDto> {
  private constructor(private readonly timeGateway: TimeGateway) {}

  public static criar(timeGateway: TimeGateway) {
    return new AlterarTime(timeGateway);
  }

  public async executar(input: AlterarTimeInputDto): Promise<AlterarTimeOutputDto> {
    const time = await this.timeGateway.buscarPorId(input.id);
    if (!time) {
      throw ErroPersonalizado.criar({
        mensagem: "Time não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (time.donoId !== input.requisitanteId && !input.isAdmin) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o dono do time pode alterá-lo.",
        status: StatusErro.erroProibido,
      });
    }

    if (input.nome !== undefined) {
      const nome = input.nome.trim();
      if (nome.length < 2) {
        throw ErroPersonalizado.criar({
          mensagem: "Nome do time deve ter no mínimo 2 caracteres.",
          status: StatusErro.erroParametro,
        });
      }
      time.nome = nome;
    }

    if (input.tag !== undefined) {
      const tag = input.tag.trim().toUpperCase();
      if (tag.length < 2 || tag.length > 4) {
        throw ErroPersonalizado.criar({
          mensagem: "Tag deve ter entre 2 e 4 caracteres.",
          status: StatusErro.erroParametro,
        });
      }
      time.tag = tag;
    }

    if (input.fotoUrl !== undefined) {
      time.fotoUrl = input.fotoUrl.trim() || undefined;
    }

    await this.timeGateway.atualizar(time);

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
